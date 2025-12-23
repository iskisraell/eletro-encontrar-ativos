# API Sample Files

This directory contains sample JSON responses from the Ativos API v5.2.0 for testing and reference purposes.

## Sample Files Overview

### Basic Queries

- **sample_basic.json** - Basic API response with 3 records, no filters
- **sample_single_record.json** - Single record response example

### Filtered Queries

- **sample_filtered_status.json** - Filtered by status (Ativo)
- **sample_filtered_city.json** - Filtered by city (SÃO PAULO)

### Search Queries

- **sample_search_eletro.json** - Search by Nº Eletro (A08802)

### Pagination

- **sample_pagination.json** - Pagination example (start=10, limit=5)

### Metadata

- **sample_meta_version.json** - API version and features information
- **sample_meta_schema.json** - API schema with field definitions
- **sample_meta_layers.json** - Available layers and their configuration

### Layered Data

- **sample_layer_main.json** - Main data layer only
- **sample_layer_panels.json** - Panels data layer with digital/static panel info
- **sample_layer_abrigoamigo.json** - Abrigo Amigo data layer (NEW v5.2)
- **sample_layer_full.json** - Full merged layer (Main + Panels + Abrigo Amigo)
- **sample_layer_summary.json** - Summary layer with flattened panel counts and Abrigo Amigo status

## API Version

All samples reflect **API v5.2.0** structure with:

- Enhanced metadata (`apiVersion`, `layer`, `cached`, `cacheExpires`, `executionTimeMs`)
- Pagination links (`self`, `next`, `prev`, `first`, `last`)
- Total record count: **22,038** active records
- **NEW v5.2**: Abrigo Amigo layer with 305 equipped bus stops
- **NEW v5.2**: `abrigoAmigo` nested object in full layer
- **NEW v5.2**: `hasAbrigoAmigo`, `abrigoAmigoCliente` fields in summary layer

## Data Layers

| Layer         | Description                             | Records |
| ------------- | --------------------------------------- | ------- |
| `main`        | Core shelter/totem data                 | 22,038  |
| `panels`      | Digital and static panel information    | 2,498   |
| `abrigoamigo` | Women's safety initiative stops         | 305     |
| `full`        | Merged main + panels + abrigoamigo      | Varies  |
| `summary`     | Flat panel counts + Abrigo Amigo status | Varies  |

## Common Fields in Data Records

- **Nº Eletro** - Equipment identifier (primary key)
- **Nº Parada** - Stop/station number (secondary key)
- **Endereço** - Address
- **Bairro** - Neighborhood
- **Cidade** - City
- **Estado** - State
- **Status** - Equipment status
- **Latitude/Longitude** - Geospatial coordinates
- **Link Operações** - Operations portal link

## Abrigo Amigo Fields (NEW v5.2)

- **abrigoAmigo.enabled** - Has Abrigo Amigo technology (boolean)
- **abrigoAmigo.cliente** - Sponsor (Claro, Governo)
- **abrigoAmigo.paradaOriginal** - Original Nº Parada from source sheet
- **hasAbrigoAmigo** - Flat boolean (summary layer only)
- **abrigoAmigoCliente** - Flat sponsor value (summary layer only)

## Usage

These samples can be used for:

- API endpoint testing
- Documentation examples
- Frontend development and mocking
- Integration testing
- Data structure validation
