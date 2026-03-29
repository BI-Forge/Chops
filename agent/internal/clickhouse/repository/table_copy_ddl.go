package repository

import (
	"fmt"
	"strings"
	"unicode"
)

// rewriteCreateTableDDL replaces the source qualified table name in ClickHouse CREATE TABLE DDL with the new table name (same database).
func rewriteCreateTableDDL(ddl, database, oldTable, newTable string) (string, error) {
	ddl = strings.TrimSpace(ddl)
	if ddl == "" {
		return "", fmt.Errorf("empty DDL")
	}

	esc := func(s string) string {
		return strings.ReplaceAll(s, "`", "``")
	}
	backtickQualified := fmt.Sprintf("`%s`.`%s`", esc(database), esc(oldTable))
	backtickNew := fmt.Sprintf("`%s`.`%s`", esc(database), esc(newTable))
	if strings.Contains(ddl, backtickQualified) {
		return strings.Replace(ddl, backtickQualified, backtickNew, 1), nil
	}

	plainQualified := database + "." + oldTable
	plainNew := database + "." + newTable
	if strings.Contains(ddl, plainQualified) {
		return strings.Replace(ddl, plainQualified, plainNew, 1), nil
	}

	// Table-only form: `db`.`old` already tried; try `old` only after CREATE TABLE db. — uncommon
	return "", fmt.Errorf("could not find qualified table name in create_table_query")
}

// validateNewTableName rejects empty or unsafe identifiers for COPY (injection-safe subset).
func validateNewTableName(name string) error {
	if name == "" {
		return fmt.Errorf("table name is required")
	}
	if len(name) > 255 {
		return fmt.Errorf("table name too long")
	}
	for _, r := range name {
		if r == '`' || r == ';' || r == '\n' || r == '\r' || unicode.IsSpace(r) {
			return fmt.Errorf("invalid character in table name")
		}
	}
	return nil
}
