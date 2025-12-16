# Panel API Debug Report

**Date:** December 16, 2025  
**API Version:** 5.0.0  
**Issue:** Panels layer returning `count: 0, total: 0`

---

## Executive Summary

The API's `panels` layer is returning empty data (`count: 0`) despite the source spreadsheet containing panel information for thousands of equipment records. This report documents the investigation findings and provides actionable steps to resolve the issue.

---

## Observed Behavior

### API Response (panels layer)
```json
{
  "status": "success",
  "meta": {
    "apiVersion": "5.0.0",
    "layer": "panels",
    "count": 0,
    "total": 0
  },
  "data": []
}
```

### Expected Behavior
The panels layer should return records with panel data structured as:
```json
{
  "Nº Eletro": "A01516",
  "digital": {
    "boxes": 1,
    "faces": 1,
    "position": "90°",
    "type": "SIMPLES"
  },
  "static": {
    "boxes": 2,
    "faces": 2,
    "position": "180°",
    "type": "SUSPENSO"
  },
  "shelterModel": "CAOS LEVE",
  "hasDigital": true,
  "hasStatic": true,
  "totalPanels": 3
}
```

---

## Source Data Analysis

### Panels Spreadsheet Structure

Based on the truncated CSV sample (`TRUNCATED de LISTA DE PAINEIS ESTATICOS E DIGITAL - Pontos não SEP.csv`), the source spreadsheet has the following column structure:

| Column Name | Description | Example Values |
|-------------|-------------|----------------|
| `Nº Eletro` | Equipment identifier (join key) | A01516, A01517 |
| `Nº Parada NOVO` | Ignored by API | 720010451 |
| `Nº Parada` | Stop number | 720010451 |
| `SEP` | SEP identifier | 33498, empty |
| `Endereço` | Address | RUA JOAO ALFREDO... |
| `Bairro` | Neighborhood | SANTO AMARO |
| `Latitude` | Latitude (Brazilian format) | -23,657252 |
| `Longitude` | Longitude (Brazilian format) | -46,700697 |
| `Filial` | Branch | Sul, Matriz, Leste |
| `Modelo de Abrigo` | Shelter model | CAOS LEVE, CAOS ESTRUTURADO |
| `QTDE. CAIXA DIGITAL` | Digital box count | 1, 2, empty |
| `FACE DIGITAL` | Digital face count | 1, 2, empty |
| `DIGITAL POSIÇÃO` | Digital position | 90°, 45°, empty |
| `DIGITAL TIPO` | Digital type | SIMPLES, empty |
| *(empty column)* | Separator | |
| `QTDE. CAIXA ESTATICA` | Static box count | 1, 2, empty |
| `FACE ESTATICA` | Static face count | 1, 2, empty |
| `ESTATICO POSIÇÃO` | Static position | 180°, 45°, empty |
| `ESTATICO TIPOS` | Static type | SIMPLES, SUSPENSO, SIMPLES/SUSPENSO |
| `OBSERVAÇÃO` | Observations | BOE/DD, CHINA, empty |

### Data Patterns Observed

1. **Empty cells indicate no panels** - Unlike the main layer which uses "-" for empty values, the panels sheet uses empty cells
2. **Brazilian number format** - Coordinates use comma as decimal separator
3. **Multiple panel types** - Static types can be combined (e.g., "SIMPLES/SUSPENSO")
4. **Mix of equipment** - Some have only digital, some only static, some both, some neither

### Sample Data Distribution (from CSV)

From the 148 records in the sample:
- Equipment with digital panels: ~45 records
- Equipment with static panels: ~95 records
- Equipment with both: ~35 records
- Equipment with neither: ~10 records

---

## Probable Root Causes

### 1. Column Name Mismatch (Most Likely)

The API's `fetchPanelsIndex` function likely expects different column names than what exists in the actual spreadsheet.

**Expected by API (hypothetical):**
```
Digital Boxes, Digital Faces, Digital Position, Digital Type
Static Boxes, Static Faces, Static Position, Static Type
```

**Actual in Spreadsheet:**
```
QTDE. CAIXA DIGITAL, FACE DIGITAL, DIGITAL POSIÇÃO, DIGITAL TIPO
QTDE. CAIXA ESTATICA, FACE ESTATICA, ESTATICO POSIÇÃO, ESTATICO TIPOS
```

### 2. Sheet Tab Name Mismatch

The API configuration specifies:
```json
{
  "id": "panels",
  "source": {
    "sheetId": "19aG4aS4iH42vbVwi6JJ9aKuhYQmXQ2fMcOSRWl7ochY",
    "tab": "Pontos não SEP"
  }
}
```

The actual tab name in the spreadsheet may differ (e.g., case sensitivity, special characters).

### 3. Empty Value Handling

The API may be filtering out records where panel columns are empty, resulting in zero matches if the filtering logic is too aggressive.

### 4. Permission Issues

The panels spreadsheet (`19aG4aS4iH42vbVwi6JJ9aKuhYQmXQ2fMcOSRWl7ochY`) may have different sharing permissions than the main spreadsheet.

### 5. Data Transformation Errors

The transformation from raw CSV columns to the normalized structure (`digital.boxes`, `static.boxes`, etc.) may be failing silently.

---

## Recommended Fix Actions

### Immediate Investigation

1. **Verify Spreadsheet Access**
   ```javascript
   // In Apps Script, test direct access
   const panelsSheet = SpreadsheetApp.openById('19aG4aS4iH42vbVwi6JJ9aKuhYQmXQ2fMcOSRWl7ochY');
   const tabs = panelsSheet.getSheets().map(s => s.getName());
   Logger.log('Available tabs: ' + JSON.stringify(tabs));
   ```

2. **Log Column Headers**
   ```javascript
   const sheet = panelsSheet.getSheetByName('Pontos não SEP'); // or actual tab name
   const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
   Logger.log('Headers: ' + JSON.stringify(headers));
   ```

3. **Test Data Fetch**
   ```javascript
   const data = sheet.getDataRange().getValues();
   Logger.log('Row count: ' + data.length);
   Logger.log('First row: ' + JSON.stringify(data[1])); // Skip header
   ```

### Code Fix (in `fetchPanelsIndex` function)

Update column mapping to match actual spreadsheet headers:

```javascript
// Current (likely)
const DIGITAL_BOXES_COL = 'Digital Boxes';

// Should be
const DIGITAL_BOXES_COL = 'QTDE. CAIXA DIGITAL';
const DIGITAL_FACES_COL = 'FACE DIGITAL';
const DIGITAL_POSITION_COL = 'DIGITAL POSIÇÃO';
const DIGITAL_TYPE_COL = 'DIGITAL TIPO';

const STATIC_BOXES_COL = 'QTDE. CAIXA ESTATICA';
const STATIC_FACES_COL = 'FACE ESTATICA';
const STATIC_POSITION_COL = 'ESTATICO POSIÇÃO';
const STATIC_TYPE_COL = 'ESTATICO TIPOS';

const SHELTER_MODEL_COL = 'Modelo de Abrigo';
const OBSERVATION_COL = 'OBSERVAÇÃO';
```

### Empty Value Handling

```javascript
function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
}

function hasPanels(row) {
  const digitalBoxes = parseNumber(row[DIGITAL_BOXES_COL]);
  const staticBoxes = parseNumber(row[STATIC_BOXES_COL]);
  return digitalBoxes > 0 || staticBoxes > 0;
}
```

---

## Column Mapping Reference

| API Field | Spreadsheet Column | Transform |
|-----------|-------------------|-----------|
| `digital.boxes` | `QTDE. CAIXA DIGITAL` | `parseInt()` or 0 |
| `digital.faces` | `FACE DIGITAL` | `parseInt()` or 0 |
| `digital.position` | `DIGITAL POSIÇÃO` | String or null |
| `digital.type` | `DIGITAL TIPO` | String or null |
| `static.boxes` | `QTDE. CAIXA ESTATICA` | `parseInt()` or 0 |
| `static.faces` | `FACE ESTATICA` | `parseInt()` or 0 |
| `static.position` | `ESTATICO POSIÇÃO` | String or null |
| `static.type` | `ESTATICO TIPOS` | String or null |
| `shelterModel` | `Modelo de Abrigo` | String |
| `observation` | `OBSERVAÇÃO` | String or null |
| `hasDigital` | Computed | `digital.boxes > 0` |
| `hasStatic` | Computed | `static.boxes > 0` |
| `totalPanels` | Computed | `digital.boxes + static.boxes` |

---

## Testing Checklist

After applying fixes:

- [ ] Panels layer returns non-zero count
- [ ] Digital panel data correctly populated
- [ ] Static panel data correctly populated
- [ ] `hasDigital` and `hasStatic` flags accurate
- [ ] `totalPanels` correctly computed
- [ ] Summary layer includes panel aggregations
- [ ] Full layer merges panels with main data correctly
- [ ] Panel filters (`hasDigital`, `hasStatic`) work

---

## Frontend Adaptation

While the API fix is pending, the frontend has been updated to:

1. **Fallback Logic**: Use legacy fields (`Painel Digital`, `Painel Estático - Tipo`) when summary fields are unavailable
2. **Graceful Degradation**: Dashboard still functions with main layer data
3. **Ready for Summary Layer**: Types and logic prepared to consume `summary` layer once API is fixed

---

## Related Files

- API Configuration: `sample_meta_layers.json`
- Panels Layer Sample: `sample_layer_panels.json`
- Source CSV Sample: `TRUNCATED de LISTA DE PAINEIS ESTATICOS E DIGITAL - Pontos não SEP.csv`
- Summary Layer Sample: `sample_layer_summary.json`
