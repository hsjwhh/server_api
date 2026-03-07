# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added a centralized configuration module with environment loading, parsing, and startup validation.
- Added `.env.example` as the canonical template for local and deployment configuration.
- Added a standardized project changelog following Keep a Changelog.

### Changed
- Changed application bootstrap to read CORS and port settings from the centralized config layer.
- Changed authentication and middleware code to consume JWT and cookie settings from centralized configuration.
- Changed database connection setup to read credentials and connection options from environment variables instead of hardcoded values.

### Security
- Removed hardcoded database credentials from source-controlled runtime configuration.
- Added fail-fast validation for required secrets and database connection variables.
