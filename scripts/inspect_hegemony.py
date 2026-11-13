from pathlib import Path
import json
import pandas as pd

path = Path('materiales_curso/Hegemony.dta')
df = pd.read_stata(path)
with pd.io.stata.StataReader(path) as reader:
    labels = reader.variable_labels()

columns = ['c_pres', 'c_coal', 'enph', 'legpower', 'j_pres', 'j_party', 'demonst', 'polity2']
chile = df.loc[df['ccode'].eq('CHL')].copy()
chile_since_1950 = chile.loc[chile['year'].ge(1950)].copy()

report = {
    'file': str(path),
    'rows': int(len(df)),
    'columns': list(df.columns),
    'variable_labels': labels,
    'chile': {
        'rows': int(len(chile)),
        'year_min': int(chile['year'].min()),
        'year_max': int(chile['year'].max()),
        'duplicate_country_years': int(chile.duplicated(['ccode', 'year']).sum()),
        'coverage': {},
        'annual_since_1950': json.loads(
            chile_since_1950[['year', 'president', 'entry', *columns, 'break', 'caso']]
            .astype(object).where(lambda x: x.notna(), None)
            .to_json(orient='records', date_format='iso')
        ),
    },
}

for column in columns:
    values = chile[column].dropna()
    report['chile']['coverage'][column] = {
        'label': labels.get(column),
        'non_null': int(values.size),
        'null': int(chile[column].isna().sum()),
        'year_min': int(chile.loc[chile[column].notna(), 'year'].min()) if len(values) else None,
        'year_max': int(chile.loc[chile[column].notna(), 'year'].max()) if len(values) else None,
        'min': float(values.min()) if len(values) else None,
        'max': float(values.max()) if len(values) else None,
        'unique_values': int(values.nunique()),
    }

output = Path('artifacts/hegemony-review.json')
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

print(json.dumps({k: v for k, v in report.items() if k != 'chile'}, ensure_ascii=False, indent=2))
print(json.dumps({'chile_coverage': report['chile']['coverage']}, ensure_ascii=False, indent=2))
print('\nCHILE DESDE 1950')
print(chile_since_1950[['year', 'president', 'c_pres', 'c_coal', 'enph', 'legpower', 'j_pres', 'j_party', 'demonst', 'break', 'caso']].to_string(index=False))
print(f'\nInforme completo: {output}')
