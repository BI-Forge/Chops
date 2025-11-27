package api_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"clickhouse-ops/internal/api/v1/handlers"
	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

type stubUsersRepo struct {
	users      []string
	err        error
	called     bool
	lastNode   string
}

func (s *stubUsersRepo) GetUsers(ctx context.Context, nodeName string) ([]string, error) {
	s.called = true
	s.lastNode = nodeName
	return s.users, s.err
}

func TestUsersHandlerReturnsUsers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubUsersRepo{
		users: []string{"default", "ops", "test"},
	}
	h := handlers.NewUsersHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/users?node=primary", nil)
	c.Request = req

	h.GetUsers(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.called)
	assert.Equal(t, "primary", repo.lastNode)

	var resp models.UsersResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Len(t, resp.Users, 3)
	assert.Contains(t, resp.Users, "default")
	assert.Contains(t, resp.Users, "ops")
	assert.Contains(t, resp.Users, "test")
}

func TestUsersHandlerReturnsUsersWithoutNode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubUsersRepo{
		users: []string{"default", "ops"},
	}
	h := handlers.NewUsersHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/users", nil)
	c.Request = req

	h.GetUsers(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.called)
	assert.Equal(t, "", repo.lastNode)

	var resp models.UsersResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Len(t, resp.Users, 2)
}

func TestUsersHandlerReturnsEmptyList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubUsersRepo{
		users: []string{},
	}
	h := handlers.NewUsersHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/users?node=primary2", nil)
	c.Request = req

	h.GetUsers(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.called)

	var resp models.UsersResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Len(t, resp.Users, 0)
	assert.NotNil(t, resp.Users)
}

func TestUsersHandlerHandlesError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubUsersRepo{
		err: assert.AnError,
	}
	h := handlers.NewUsersHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/users?node=primary", nil)
	c.Request = req

	h.GetUsers(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.True(t, repo.called)

	var resp models.ErrorResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "Failed to load users", resp.Error)
	assert.NotEmpty(t, resp.Message)
}

func TestUsersHandlerHandlesNodeWithWhitespace(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repo := &stubUsersRepo{
		users: []string{"default"},
	}
	h := handlers.NewUsersHandlerWithRepository(logger.New(logger.InfoLevel, "text"), repo)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/users?node=%20primary%20", nil)
	c.Request = req

	h.GetUsers(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.called)
	// Node name should be trimmed
	assert.Equal(t, "primary", repo.lastNode)
}
