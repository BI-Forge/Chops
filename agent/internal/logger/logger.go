package logger

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// LogLevel represents the logging level
type LogLevel int

const (
	InfoLevel LogLevel = iota
	WarningLevel
	ErrorLevel
	FatalLevel
)

// String returns the string representation of the log level
func (l LogLevel) String() string {
	switch l {
	case InfoLevel:
		return "INFO"
	case WarningLevel:
		return "WARNING"
	case ErrorLevel:
		return "ERROR"
	case FatalLevel:
		return "FATAL"
	default:
		return "UNKNOWN"
	}
}

// ParseLogLevel parses a string to LogLevel
func ParseLogLevel(level string) (LogLevel, error) {
	switch strings.ToLower(level) {
	case "info":
		return InfoLevel, nil
	case "warning", "warn":
		return WarningLevel, nil
	case "error":
		return ErrorLevel, nil
	case "fatal":
		return FatalLevel, nil
	default:
		return InfoLevel, fmt.Errorf("invalid log level: %s", level)
	}
}

// Logger represents the application logger
type Logger struct {
	level   LogLevel
	formats []string
}

// New creates a new logger instance
func New(level LogLevel, format string) *Logger {
	formats := parseFormats(format)
	return &Logger{
		level:   level,
		formats: formats,
	}
}

// NewWithFormats creates a new logger instance with multiple formats
func NewWithFormats(level LogLevel, formats []string) *Logger {
	return &Logger{
		level:   level,
		formats: formats,
	}
}

// parseFormats parses comma-separated format string into slice
func parseFormats(format string) []string {
	if format == "" {
		return []string{"text"}
	}
	
	formats := strings.Split(format, ",")
	var result []string
	for _, f := range formats {
		f = strings.TrimSpace(f)
		if f != "" {
			result = append(result, f)
		}
	}
	
	if len(result) == 0 {
		return []string{"text"}
	}
	
	return result
}

// SetLevel sets the logging level
func (l *Logger) SetLevel(level LogLevel) {
	l.level = level
}

// SetFormat sets the log format
func (l *Logger) SetFormat(format string) {
	l.formats = parseFormats(format)
}

// SetFormats sets multiple log formats
func (l *Logger) SetFormats(formats []string) {
	l.formats = formats
}

// shouldLog checks if the message should be logged based on the current level
func (l *Logger) shouldLog(level LogLevel) bool {
	return level >= l.level
}

// formatMessage formats the log message according to the specified formats
func (l *Logger) formatMessage(level LogLevel, message string) []string {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	var formattedMessages []string
	
	for _, format := range l.formats {
		switch strings.ToLower(format) {
		case "json":
			formattedMessages = append(formattedMessages, fmt.Sprintf(`{"timestamp":"%s","level":"%s","message":"%s"}`, timestamp, level.String(), message))
		case "text", "console":
			formattedMessages = append(formattedMessages, fmt.Sprintf("[%s] %s: %s", timestamp, level.String(), message))
		default:
			formattedMessages = append(formattedMessages, fmt.Sprintf("[%s] %s: %s", timestamp, level.String(), message))
		}
	}
	
	return formattedMessages
}

// Info logs an info message
func (l *Logger) Info(message string) {
	if l.shouldLog(InfoLevel) {
		formattedMessages := l.formatMessage(InfoLevel, message)
		for _, msg := range formattedMessages {
			fmt.Println(msg)
		}
	}
}

// Infof logs a formatted info message
func (l *Logger) Infof(format string, args ...interface{}) {
	if l.shouldLog(InfoLevel) {
		message := fmt.Sprintf(format, args...)
		formattedMessages := l.formatMessage(InfoLevel, message)
		for _, msg := range formattedMessages {
			fmt.Println(msg)
		}
	}
}

// Warning logs a warning message
func (l *Logger) Warning(message string) {
	if l.shouldLog(WarningLevel) {
		formattedMessages := l.formatMessage(WarningLevel, message)
		for _, msg := range formattedMessages {
			fmt.Println(msg)
		}
	}
}

// Warningf logs a formatted warning message
func (l *Logger) Warningf(format string, args ...interface{}) {
	if l.shouldLog(WarningLevel) {
		message := fmt.Sprintf(format, args...)
		formattedMessages := l.formatMessage(WarningLevel, message)
		for _, msg := range formattedMessages {
			fmt.Println(msg)
		}
	}
}

// Error logs an error message
func (l *Logger) Error(message string) {
	if l.shouldLog(ErrorLevel) {
		formattedMessages := l.formatMessage(ErrorLevel, message)
		for _, msg := range formattedMessages {
			fmt.Println(msg)
		}
	}
}

// Errorf logs a formatted error message
func (l *Logger) Errorf(format string, args ...interface{}) {
	if l.shouldLog(ErrorLevel) {
		message := fmt.Sprintf(format, args...)
		formattedMessages := l.formatMessage(ErrorLevel, message)
		for _, msg := range formattedMessages {
			fmt.Println(msg)
		}
	}
}

// Fatal logs a fatal message and exits the application
func (l *Logger) Fatal(message string) {
	if l.shouldLog(FatalLevel) {
		formattedMessages := l.formatMessage(FatalLevel, message)
		for _, msg := range formattedMessages {
			fmt.Println(msg)
		}
		os.Exit(1)
	}
}

// Fatalf logs a formatted fatal message and exits the application
func (l *Logger) Fatalf(format string, args ...interface{}) {
	if l.shouldLog(FatalLevel) {
		message := fmt.Sprintf(format, args...)
		formattedMessages := l.formatMessage(FatalLevel, message)
		for _, msg := range formattedMessages {
			fmt.Println(msg)
		}
		os.Exit(1)
	}
}

// GetLevel returns the current logging level
func (l *Logger) GetLevel() LogLevel {
	return l.level
}

// GetFormats returns the current log formats
func (l *Logger) GetFormats() []string {
	return l.formats
}

// GetFormat returns the first log format (for backward compatibility)
func (l *Logger) GetFormat() string {
	if len(l.formats) > 0 {
		return l.formats[0]
	}
	return "text"
}
