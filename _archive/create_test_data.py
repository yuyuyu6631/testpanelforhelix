
import pandas as pd
import os

# 确保目录存在
os.makedirs(r'D:\apiautotest\data\input', exist_ok=True)

data = [
    {
        "问题": "今年营收多少",
        "预期关键字": "营业总收入,财务报表",
        "预期条件": "报告日期"
    },
    {
        "问题": "北方稀土收入及利润情况",
        "预期关键字": "收入,利润", 
        "预期条件": ""
    },
    {
        "问题": "查询所有财务数据",
        "预期关键字": "SELECT",
        "预期条件": ""
    }
]

df = pd.DataFrame(data)
output_file = r'D:\apiautotest\data\input\test_3_cases.xlsx'
df.to_excel(output_file, index=False)
print(f"Created {output_file}")
