package clickhouse

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	"clickhouse-ops/internal/clickhouse/repository"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

const (
	settingsQueryTimeout    = 5 * time.Second
	allSettingsQueryTimeout = 10 * time.Second
	defaultAllSettingsLimit = 50
	maxAllSettingsLimit     = 500
)

// SettingsRepository defines repository methods used by this handler.
// GetUserSettings is used by UsersHandler in users.go.
type SettingsRepository interface {
	GetAllAvailableSettings(ctx context.Context, nodeName string) ([]repository.AvailableSettingRow, error)
	GetAllDBSettings(ctx context.Context, nodeName string, q repository.AllDBSettingsQuery) ([]repository.DBSettingRow, int, error)
	GetDBSettingByName(ctx context.Context, nodeName, name string) (*repository.DBSettingDetailRow, error)
}

// SettingsHandler handles available settings, merged DB settings list, etc.
// Get user settings and update user settings are handled by UsersHandler in users.go.
type SettingsHandler struct {
	repo   SettingsRepository
	logger *logger.Logger
}

// NewSettingsHandler creates a production settings handler.
func NewSettingsHandler(log *logger.Logger, cfg *config.Config) (*SettingsHandler, error) {
	repo, err := repository.NewSettingsRepository(cfg, log)
	if err != nil {
		return nil, err
	}
	return &SettingsHandler{
		repo:   repo,
		logger: log,
	}, nil
}

// NewSettingsHandlerWithRepository creates a settings handler using a custom repository (testing helper).
func NewSettingsHandlerWithRepository(repo SettingsRepository, log *logger.Logger) *SettingsHandler {
	return &SettingsHandler{
		repo:   repo,
		logger: log,
	}
}

// Allowed tier filter values (matched case-insensitively against unified tier column).
var allowedAllSettingsTiers = map[string]struct{}{
	"obsolete":     {},
	"production":   {},
	"experimental": {},
	"beta":         {},
	"milestone":    {},
}

// allowedAllSettingsTypes lists type names allowed for the `type` query filter (exact match, case-sensitive).
// Per ClickHouse docs, system.settings.type and system.server_settings.type describe the assignable value type
// (see https://clickhouse.com/docs/en/operations/system-tables/settings and .../server_settings).
// Names match ClickHouse SettingField type tokens (BaseSettings IMPLEMENT_SETTINGS_TRAITS_ macro, field #TYPE).
// Union of DISTINCT type from system.settings and system.server_settings on ClickHouse 25.10; extend when adding server support for newer releases.
var allowedAllSettingsTypes = map[string]struct{}{
	"AlterUpdateMode":                      {},
	"ArrowCompression":                     {},
	"Bool":                                 {},
	"BoolAuto":                             {},
	"CapnProtoEnumComparingMode":           {},
	"Char":                                 {},
	"DateTimeInputFormat":                  {},
	"DateTimeOutputFormat":                 {},
	"DateTimeOverflowBehavior":             {},
	"DecorrelationJoinKind":                {},
	"DefaultDatabaseEngine":                {},
	"DefaultTableEngine":                   {},
	"Dialect":                              {},
	"DistributedCacheLogMode":              {},
	"DistributedCachePoolBehaviourOnLimit": {},
	"DistributedDDLOutputMode":             {},
	"DistributedProductMode":               {},
	"Double":                               {},
	"EscapingRule":                         {},
	"Float":                                {},
	"FloatAuto":                            {},
	"GeoToH3ArgumentOrder":                 {},
	"GroupArrayActionWhenLimitReached":     {},
	"IcebergMetadataLogLevel":              {},
	"IdentifierQuotingRule":                {},
	"IdentifierQuotingStyle":               {},
	"Int32":                                {},
	"Int64":                                {},
	"IntervalOutputFormat":                 {},
	"JoinAlgorithm":                        {},
	"JoinStrictness":                       {},
	"LightweightDeleteMode":                {},
	"LightweightMutationProjectionMode":    {},
	"LoadBalancing":                        {},
	"LocalFSReadMethod":                    {},
	"LogQueriesType":                       {},
	"LogsLevel":                            {},
	"Map":                                  {},
	"MaxThreads":                           {},
	"Milliseconds":                         {},
	"MsgPackUUIDRepresentation":            {},
	"MySQLDataTypesSupport":                {},
	"NonZeroUInt64":                        {},
	"ORCCompression":                       {},
	"OverflowMode":                         {},
	"OverflowModeGroupBy":                  {},
	"ParallelReplicasCustomKeyFilterType":  {},
	"ParallelReplicasMode":                 {},
	"ParquetCompression":                   {},
	"ParquetVersion":                       {},
	"QueryResultCacheNondeterministicFunctionHandling": {},
	"QueryResultCacheSystemTableHandling":              {},
	"SQLSecurityType":                                  {},
	"SchemaInferenceMode":                              {},
	"Seconds":                                          {},
	"SetOperationMode":                                 {},
	"ShortCircuitFunctionEvaluation":                   {},
	"StreamingHandleErrorMode":                         {},
	"String":                                           {},
	"Timezone":                                         {},
	"TotalsMode":                                       {},
	"TransactionsWaitCSNMode":                          {},
	"UInt32":                                           {},
	"UInt64":                                           {},
	"UInt64Auto":                                       {},
	"URI":                                              {},
	"UpdateParallelMode":                               {},
	"VectorSearchFilterStrategy":                       {},
}

var allSettingsSortColumns = map[string]bool{
	"name":    true,
	"changed": true,
	"server":  true,
}

// GetAvailableSettings returns all session settings that can be assigned to a user (from system.settings).
// @Summary      Get available user settings
// @Description  Returns all ClickHouse session settings that can be assigned to users/roles (from system.settings, excluding obsolete)
// @Tags         settings
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Success      200   {object}  models.AvailableSettingsResponse
// @Failure      500   {object}  models.ErrorResponse
// @Router       /api/v1/clickhouse/settings/available [get]
func (h *SettingsHandler) GetAvailableSettings(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), settingsQueryTimeout)
	defer cancel()

	rows, err := h.repo.GetAllAvailableSettings(ctx, nodeName)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get available settings: %v", err)
		}
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Failed to load available settings",
			Message: err.Error(),
		})
		return
	}

	settings := make([]models.AvailableSetting, 0, len(rows))
	for _, row := range rows {
		minVal := ""
		if row.Min.Valid {
			minVal = row.Min.String
		}
		maxVal := ""
		if row.Max.Valid {
			maxVal = row.Max.String
		}
		settings = append(settings, models.AvailableSetting{
			Name:        row.Name,
			Type:        row.Type,
			Default:     row.Default,
			Description: row.Description,
			Min:         minVal,
			Max:         maxVal,
		})
	}

	c.JSON(http.StatusOK, models.AvailableSettingsResponse{
		Settings: settings,
	})
}

func parseAllSettingsLimitOffset(c *gin.Context) (limit, offset int) {
	limit = defaultAllSettingsLimit
	if v := strings.TrimSpace(c.Query("limit")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
			if limit > maxAllSettingsLimit {
				limit = maxAllSettingsLimit
			}
		}
	}
	offset = 0
	if v := strings.TrimSpace(c.Query("offset")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	return limit, offset
}

func parseAllSettingsSort(c *gin.Context) (column string, desc bool) {
	column = "name"
	if s := strings.TrimSpace(strings.ToLower(c.Query("sort"))); s != "" && allSettingsSortColumns[s] {
		column = s
	}
	order := strings.TrimSpace(strings.ToLower(c.Query("order")))
	desc = order == "desc"
	return column, desc
}

func parseServerFilter(c *gin.Context) (*bool, string) {
	raw := strings.TrimSpace(strings.ToLower(c.Query("server")))
	if raw == "" {
		return nil, ""
	}
	switch raw {
	case "true", "1":
		t := true
		return &t, ""
	case "false", "0":
		t := false
		return &t, ""
	default:
		return nil, "server must be true or false"
	}
}

func validateTierFilter(v string) (normalized string, errMsg string) {
	v = strings.TrimSpace(strings.ToLower(v))
	if v == "" {
		return "", ""
	}
	if _, ok := allowedAllSettingsTiers[v]; !ok {
		return "", "invalid tier filter"
	}
	return v, ""
}

func validateTypeFilter(v string) (string, string) {
	v = strings.TrimSpace(v)
	if v == "" {
		return "", ""
	}
	if _, ok := allowedAllSettingsTypes[v]; !ok {
		return "", "invalid type filter"
	}
	return v, ""
}

// GetAllSettings returns merged session (system.settings) and server (system.server_settings) settings with filters and pagination.
// @Summary      List all ClickHouse settings
// @Description  Merges system.settings and system.server_settings with limit, offset, tier/type/server filters, sort, and name/description search
// @Tags         settings
// @Security     BearerAuth
// @Produce      json
// @Param        node    query     string  false  "ClickHouse node hostname"
// @Param        limit   query     int     false  "Max items (default 50, max 500)"
// @Param        offset  query     int     false  "Skip items"
// @Param        sort    query     string  false  "Sort by: name, changed, server (default name)"
// @Param        order   query     string  false  "asc or desc (default asc)"
// @Param        tier    query     string  false  "Filter by tier: production, experimental, beta, milestone, obsolete"
// @Param        type    query     string  false  "Exact type string from system.settings / system.server_settings (e.g. UInt64, String, Bool); must be one of the allowed API values"
// @Param        server  query     string  false  "true = server settings only, false = session settings only"
// @Param        q       query     string  false  "Search in name and description (LIKE %...%)"
// @Success      200     {object}  models.AllDBSettingsResponse
// @Failure      400     {object}  system.ErrorResponse
// @Failure      500     {object}  system.ErrorResponse
// @Router       /api/v1/clickhouse/settings/all [get]
func (h *SettingsHandler) GetAllSettings(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	limit, offset := parseAllSettingsLimitOffset(c)
	sortCol, sortDesc := parseAllSettingsSort(c)
	tier, tierErr := validateTierFilter(c.Query("tier"))
	if tierErr != "" {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{Error: "Bad request", Message: tierErr})
		return
	}
	typeFilter, typeErr := validateTypeFilter(c.Query("type"))
	if typeErr != "" {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{Error: "Bad request", Message: typeErr})
		return
	}
	serverPtr, serverErr := parseServerFilter(c)
	if serverErr != "" {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{Error: "Bad request", Message: serverErr})
		return
	}
	search := strings.TrimSpace(c.Query("q"))

	if h.repo == nil {
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Settings repository unavailable",
			Message: "ClickHouse settings repository is not initialized",
		})
		return
	}

	q := repository.AllDBSettingsQuery{
		Limit:     limit,
		Offset:    offset,
		Tier:      tier,
		Type:      typeFilter,
		Server:    serverPtr,
		Sort:      sortCol,
		OrderDesc: sortDesc,
		Search:    search,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), allSettingsQueryTimeout)
	defer cancel()

	rows, total, err := h.repo.GetAllDBSettings(ctx, nodeName, q)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to list all DB settings: %v", err)
		}
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Failed to load settings",
			Message: err.Error(),
		})
		return
	}

	out := make([]models.DBSettingItem, 0, len(rows))
	for _, r := range rows {
		out = append(out, models.DBSettingItem{
			Name:                     r.Name,
			Description:              r.Description,
			Value:                    r.Value,
			Type:                     r.Type,
			Changed:                  r.Changed != 0,
			ChangeableWithoutRestart: r.ChangeableWithoutRestart,
			Server:                   r.Server,
			Tier:                     r.Tier,
		})
	}

	c.JSON(http.StatusOK, models.AllDBSettingsResponse{
		Settings: out,
		Total:    total,
		Limit:    limit,
		Offset:   offset,
	})
}

// GetSettingByName returns a single merged setting (system.settings and/or system.server_settings) by exact name.
// @Summary      Get one ClickHouse setting by name
// @Description  Merged setting by name; includes description plus min, max, readonly from system.settings (empty/false for server-only rows)
// @Tags         settings
// @Security     BearerAuth
// @Produce      json
// @Param        node  query     string  false  "ClickHouse node hostname"
// @Param        name  query     string  true   "Exact setting name"
// @Success      200   {object}  models.DBSettingDetailItem
// @Failure      400   {object}  system.ErrorResponse
// @Failure      404   {object}  system.ErrorResponse
// @Failure      500   {object}  system.ErrorResponse
// @Router       /api/v1/clickhouse/settings/one [get]
func (h *SettingsHandler) GetSettingByName(c *gin.Context) {
	nodeName := strings.TrimSpace(c.Query("node"))
	name := strings.TrimSpace(c.Query("name"))
	if name == "" {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
			Error:   "Bad request",
			Message: "name query parameter is required",
		})
		return
	}

	if h.repo == nil {
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Settings repository unavailable",
			Message: "ClickHouse settings repository is not initialized",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), allSettingsQueryTimeout)
	defer cancel()

	row, err := h.repo.GetDBSettingByName(ctx, nodeName, name)
	if err != nil {
		if h.logger != nil {
			h.logger.Errorf("Failed to get setting by name: %v", err)
		}
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Failed to load setting",
			Message: err.Error(),
		})
		return
	}
	if row == nil {
		c.JSON(http.StatusNotFound, apiSystemModels.ErrorResponse{
			Error:   "Not found",
			Message: "no setting with the given name",
		})
		return
	}

	c.JSON(http.StatusOK, models.DBSettingDetailItem{
		Name:                     row.Name,
		Description:              row.Description,
		Value:                    row.Value,
		Type:                     row.Type,
		Changed:                  row.Changed != 0,
		ChangeableWithoutRestart: row.ChangeableWithoutRestart,
		Server:                   row.Server,
		Tier:                     row.Tier,
		Min:                      row.Min,
		Max:                      row.Max,
		Readonly:                 row.Readonly != 0,
	})
}
