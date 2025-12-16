# API Sample Files

This directory contains sample JSON responses from the Ativos API v5.0.0 for testing and reference purposes.

## Sample Files Overview

### Basic Queries

- **sample_basic.json** (3.21 KB) - Basic API response with 3 records, no filters
- **sample_single_record.json** (1.24 KB) - Single record response example

### Filtered Queries

- **sample_filtered_status.json** (4.76 KB) - Filtered by status (Ativo)
- **sample_filtered_city.json** (2.98 KB) - Filtered by city (SÃO PAULO)
- **sample_filtered_state.json** (2.09 KB) - Filtered by state (SP)
- **sample_filtered_neighborhood.json** (2.09 KB) - Filtered by neighborhood (LAPA)

### Search Queries

- **sample_search_eletro.json** (26.21 KB) - Search by Nº Eletro (A08802)
- **sample_search_parada.json** (26.22 KB) - Search by Nº Parada (480014794)

### Pagination

- **sample_pagination.json** (5.07 KB) - Pagination example (start=10, limit=5)

### Metadata

- **sample_meta_version.json** (0.20 KB) - API metadata structure
- **sample_meta_schema.json** (0.49 KB) - API schema information

### Layered Data (Legacy/Future)

- **sample_layer_full.json** (4.64 KB) - Full data layer
- **sample_layer_main.json** (4.17 KB) - Main data layer
- **sample_layer_panels.json** (0.90 KB) - Panels data layer
- **sample_layer_summary.json** (4.71 KB) - Summary data layer
- **sample_meta_layers.json** (1.58 KB) - Metadata for layers

## API Version

All samples reflect **API v5.0.0** structure with:

- Enhanced metadata (`apiVersion`, `layer`, `cached`, `cacheExpires`, `executionTimeMs`)
- Pagination links (`self`, `next`, `first`, `last`)
- Total record count: **22,038** active records

## Common Fields in Data Records

- **Nº Eletro** - Equipment identifier
- **Nº Parada** - Stop/station number
- **Endereço** - Address
- **Bairro** - Neighborhood
- **Cidade** - City
- **Estado** - State
- **Status** - Equipment status
- **Latitude/Longitude** - Geospatial coordinates
- **Link Operações** - Operations portal link

## Usage

These samples can be used for:

- API endpoint testing
- Documentation examples
- Frontend development and mocking
- Integration testing
- Data structure validation
