import pandas as pd

# -------------------------------
# Utility Functions
# -------------------------------


# --- MODIFIED: Added specific error handling ---
def read_financials(file_path: str):
    """Reads all sheets from a single Excel file and returns them as DataFrames."""
    try:
        # Read all sheets into a dictionary of DataFrames
        sheets = pd.read_excel(file_path, sheet_name=None)
        return sheets
    except FileNotFoundError:
        # This is the most likely error
        print(f"Error: The file was not found at the path: {file_path}")
        return None
    except Exception as e:
        print(f"Error reading Excel file {file_path}: {e}")
        return None


# --- END MODIFIED ---


# --- NEW FUNCTION ---
def consolidate_financials(file_paths: list[str]):
    """
    Reads multiple Excel files and consolidates their financial sheets
    by summing numeric values grouped by the 'Field' column.
    """
    consolidated_sheets_data = {"Income Statement": [], "Balance Sheet": []}

    # 1. Read data from all files
    for file_path in file_paths:
        sheets = read_financials(file_path)
        if sheets is None:
            print(f"Warning: Could not read {file_path}. Skipping.")
            continue

        if "Income Statement" in sheets:
            consolidated_sheets_data["Income Statement"].append(
                sheets["Income Statement"]
            )
        else:
            print(f"Warning: 'Income Statement' not found in {file_path}. Skipping.")

        if "Balance Sheet" in sheets:
            consolidated_sheets_data["Balance Sheet"].append(sheets["Balance Sheet"])
        else:
            print(f"Warning: 'Balance Sheet' not found in {file_path}. Skipping.")

    # 2. Check if we have any valid data
    if (
        not consolidated_sheets_data["Income Statement"]
        or not consolidated_sheets_data["Balance Sheet"]
    ):
        print(
            "Error: No valid 'Income Statement' or 'Balance Sheet' data was found in any of the files."
        )
        return None

    try:
        # 3. Concatenate and consolidate

        # Consolidate Income Statement
        all_income = pd.concat(consolidated_sheets_data["Income Statement"])
        all_income["Field"] = all_income["Field"].fillna("").str.strip()
        # Group by 'Field' and sum all numeric columns (the years)
        final_income = all_income.groupby("Field").sum(numeric_only=True).reset_index()

        # Consolidate Balance Sheet
        all_balance = pd.concat(consolidated_sheets_data["Balance Sheet"])
        all_balance["Field"] = all_balance["Field"].fillna("").str.strip()
        final_balance = (
            all_balance.groupby("Field").sum(numeric_only=True).reset_index()
        )

        # 4. Return the consolidated dictionary of DataFrames
        return {"Income Statement": final_income, "Balance Sheet": final_balance}
    except Exception as e:
        print(f"Error during data consolidation: {e}")
        return None


def compute_ratios(financials, fiscal_year: str):
    """Computes key financial ratios from the (consolidated) financials dictionary."""
    if financials is None:
        print("Error: Financial data is None. Cannot compute ratios.")
        return {}

    income = financials.get("Income Statement")
    balance = financials.get("Balance Sheet")

    if income is None or balance is None:
        print("Error: 'Income Statement' or 'Balance Sheet' not found in financials.")
        return {}

    income["Field"] = income["Field"].fillna("")
    balance["Field"] = balance["Field"].fillna("")

    # --- Validate the provided fiscal year ---
    year_str = str(fiscal_year)
    year_int = None
    try:
        year_int = int(fiscal_year)
    except ValueError:
        pass

    year_to_analyze = None

    if year_str in income.columns and year_str in balance.columns:
        year_to_analyze = year_str
    elif (
        year_int is not None
        and year_int in income.columns
        and year_int in balance.columns
    ):
        year_to_analyze = year_int

    if year_to_analyze is None:
        print(
            f"Error: Fiscal year '{fiscal_year}' not found in 'Income Statement' or 'Balance Sheet' columns."
        )
        return {}

    latest_year = year_to_analyze  # Use the validated year

    # --- Helper Function ---
    def get_value(df, field_name, year):
        """Safely get a single value using exact match."""
        match = df.loc[df["Field"] == field_name, year]
        val = match.values[0] if not match.empty and len(match.values) > 0 else 0
        val_numeric = pd.to_numeric(val, errors="coerce")
        return val_numeric if pd.notna(val_numeric) else 0

    # --- Fetch Income Statement Values ---
    revenue = get_value(income, "Revenue from operations", latest_year)
    net_profit = get_value(income, "Profit/(Loss) for the year", latest_year)
    cogs_materials = get_value(income, "Cost of materials consumed", latest_year)
    cogs_purchases = get_value(income, "Purchases of stock-in-trade", latest_year)
    cogs_changes = get_value(
        income,
        "Changes in inventories of goods, work-in-progress and stock-in-trade",
        latest_year,
    )

    # --- Fetch Balance Sheet Values ---
    current_assets = get_value(balance, "Current assets", latest_year)
    non_current_assets = get_value(balance, "Non-current assets", latest_year)
    total_assets = current_assets + non_current_assets
    current_liabilities = get_value(balance, "Current liabilities", latest_year)
    nc_borrowings = get_value(balance, "Borrowings, non-current", latest_year)
    c_borrowings = get_value(balance, "Borrowings, current", latest_year)
    total_debt = nc_borrowings + c_borrowings
    total_equity = get_value(balance, "Equity", latest_year)
    inventories = get_value(
        balance, "Inventories", latest_year
    )  # Assumes "Inventories" is the field name

    # --- Calculate Ratios ---
    net_profit_margin = (net_profit / revenue) if revenue != 0 else 0
    roa = (net_profit / total_assets) if total_assets != 0 else 0
    debt_to_equity = (total_debt / total_equity) if total_equity != 0 else 0
    current_ratio = (
        (current_assets / current_liabilities) if current_liabilities != 0 else 0
    )

    total_cogs = cogs_materials + cogs_purchases + cogs_changes
    gross_profit = revenue - total_cogs
    gross_margin = (gross_profit / revenue) if revenue != 0 else 0

    quick_assets = current_assets - inventories
    quick_ratio = (
        (quick_assets / current_liabilities) if current_liabilities != 0 else 0
    )

    ratios = {
        "Net Profit Margin": net_profit_margin,
        "Return on Assets (ROA)": roa,
        "Debt to Equity Ratio": debt_to_equity,
        "Current Ratio": current_ratio,
        "Gross Margin": gross_margin,
        "Quick Ratio": quick_ratio,
    }

    return ratios


def score_ratios(ratios):
    """Scores ratios out of 100."""
    if not ratios:
        return {}, 0

    sub_scores = {
        "Profitability": (
            (ratios.get("Net Profit Margin", 0) * 100)
            + (ratios.get("Gross Margin", 0) * 100)
        )
        / 2,
        "Liquidity": (
            (min(ratios.get("Current Ratio", 0) / 2, 1) * 100)
            + (min(ratios.get("Quick Ratio", 0) / 1, 1) * 100)
        )
        / 2,
        "Leverage": (1 - min(ratios.get("Debt to Equity Ratio", 0) / 3, 1)) * 100,
        "Efficiency": min(ratios.get("Return on Assets (ROA)", 0) / 0.1, 1) * 100,
    }

    overall = sum(sub_scores.values()) / len(sub_scores)
    return sub_scores, overall


def analyze_trends(financials: dict):
    """Examines ratio trends over the past 3 years from (consolidated) data."""
    if financials is None:
        print("Error: Financial data is None. Cannot analyze trends.")
        return pd.DataFrame()

    income = financials.get("Income Statement")
    if income is None:
        print("Error: 'Income Statement' not found for trend analysis.")
        return pd.DataFrame()

    # Get all columns that are not 'Field' (these should be the years)
    years = [col for col in income.columns if col != "Field"]
    if not years:
        print("Error: No year columns found in Income Statement.")
        return pd.DataFrame()

    # --- Helper Function (scoped) ---
    def get_value(df, field_name, year):
        match = df.loc[df["Field"] == field_name, year]
        val = match.values[0] if not match.empty and len(match.values) > 0 else 0
        val_numeric = pd.to_numeric(val, errors="coerce")
        return val_numeric if pd.notna(val_numeric) else 0

    trend_data = []
    # Sort years to ensure correct order in the trend, just in case
    try:
        # Try to sort years numerically (e.g., 2023, 2024, 2025)
        sorted_years = sorted(years, key=lambda x: int(str(x)))
    except ValueError:
        # Fallback to string sort if they aren't numbers (e.g., 'FY23')
        sorted_years = sorted(years)

    for year in sorted_years:
        revenue = get_value(income, "Revenue from operations", year)
        pat = get_value(income, "Profit/(Loss) for the year", year)

        trend_data.append(
            {
                "Year": year,
                "Revenue": revenue,
                "Net Profit": pat,
                "Net Margin (%)": (pat / revenue * 100) if revenue != 0 else 0,
            }
        )

    if not trend_data:
        return pd.DataFrame()

    # Set index to 'Year' and transpose
    trend_df = pd.DataFrame(trend_data).set_index("Year").T
    # Change index labels to be more descriptive
    trend_df = trend_df.rename(
        index={
            "Revenue": "Revenue (in currency)",
            "Net Profit": "Net Profit (in currency)",
        }
    )
    return trend_df
