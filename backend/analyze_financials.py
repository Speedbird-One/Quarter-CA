import sys
import json
import os
import pandas as pd
from financial_utils import (
    consolidate_financials,
    compute_ratios,
    score_ratios,
    analyze_trends,
)
from openai import OpenAI
from dotenv import load_dotenv

# --- Added a try/except block for loading .env ---
try:
    # Load environment variables from .env file
    load_dotenv()
except Exception as e:
    print("--- CRITICAL ERROR in analyze_financials.py ---")
    print(f"Failed during 'load_dotenv()': {e}")
    print("Please check if the 'dotenv' library is installed correctly.")
    input("Press Enter to exit...")
    sys.exit(1)  # Stop the script
# --- END NEW ---


# -------------------------------
# AI Suggestions Function (Unchanged)
# -------------------------------
def generate_ai_insights(ratios, sub_scores, overall_score):
    """Uses the OpenAI API to generate improvement recommendations."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "Error: OPENAI_API_KEY not found. Please set it in your .env file."

    client = OpenAI(api_key=api_key)
    context = {
        "financial_ratios": ratios,
        "sub_scores": sub_scores,
        "overall_score": overall_score,
    }

    # MODIFIED PROMPT FOR A "MEDIUM" LENGTH
    prompt = f"""
    Analyze the following financial data:
    {json.dumps(context, indent=2)}

    Instructions:
    1. Identify the **top 1-2 weakest financial areas** (e.g., Profitability, Liquidity).
    2. For each area, provide **2-3 concise bullet points** for improvement.
    3. Keep the entire response to **2-3 short paragraphs total**.
    4. Use markdown for headings (###, ####) and bolding (**text**).
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert financial consultant for SMEs. You provide **concise, scannable, and actionable** advice. Keep your entire response to 2-3 short paragraphs.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Error connecting to OpenAI API: {e}"


# -------------------------------
# API-Callable Analysis Function (Unchanged)
# -------------------------------
def run_analysis(file_paths: list[str]) -> dict:
    """
    Runs the full financial analysis on a list of files, auto-detecting the
    latest fiscal year, and returns a dictionary (JSON).
    """
    try:
        # 1. Consolidate files
        financials = consolidate_financials(file_paths)
        if financials is None:
            return {
                "error": "Failed to read or consolidate financial data. Ensure files are valid .xlsx and contain 'Income Statement' and 'Balance Sheet' sheets."
            }

        # --- Auto-detect latest fiscal year ---
        income_df = financials.get("Income Statement")
        if income_df is None:
            return {"error": "Consolidated data is missing 'Income Statement' sheet."}

        year_columns = [col for col in income_df.columns if col != "Field"]
        if not year_columns:
            return {"error": "No fiscal year columns found in the consolidated data."}

        numeric_years = {}
        for col in year_columns:
            try:
                numeric_years[float(str(col))] = col
            except (ValueError, TypeError):
                pass

        if not numeric_years:
            return {
                "error": "Could not detect any numeric fiscal year columns (e.g., 2023, 2024)."
            }

        latest_numeric_year = max(numeric_years.keys())
        detected_fiscal_year = str(numeric_years[latest_numeric_year])
        print(f"--- Auto-detected fiscal year for analysis: {detected_fiscal_year} ---")

        # 2. Compute Ratios for the detected year
        ratios = compute_ratios(financials, detected_fiscal_year)

        if not ratios:
            return {
                "error": f"Failed to compute ratios for auto-detected year '{detected_fiscal_year}'. Check data integrity."
            }

        # 3. Compute Scores
        sub_scores, overall_score = score_ratios(ratios)

        # 4. Analyze Trends
        trend_df = analyze_trends(financials)
        trend_df_json = trend_df.reset_index().rename(columns={"index": "Metric"})
        trend_json = trend_df_json.to_dict(orient="records")

        # 5. Generate AI Insights
        ai_insights = generate_ai_insights(ratios, sub_scores, overall_score)

        # 6. Assemble final JSON response
        return {
            "ratios": ratios,
            "sub_scores": sub_scores,
            "overall_score": overall_score,
            "trends": trend_json,
            "ai_insights": ai_insights,
            "detected_fiscal_year": detected_fiscal_year,
        }
    except Exception as e:
        return {
            "error": f"An error occurred during analysis: {e}. Check the Excel file formats."
        }


# -------------------------------
# Original Main Function (CLI) (Unchanged)
# -------------------------------
def main_cli(file_paths: list[str]):
    """
    Original command-line interface.
    """
    print(f"\n📊 Analyzing financials from {len(file_paths)} file(s)...")
    result = run_analysis(file_paths)

    if "error" in result:
        print(f"\n--- ERROR --- \n{result['error']}")
        return

    fiscal_year = result.get("detected_fiscal_year", "N/A")
    print(f"--- Auto-detected year for analysis: {fiscal_year} ---")

    # Print Ratios
    print(f"\n📈 Key Financial Ratios ({fiscal_year}):")
    for k, v in result.get("ratios", {}).items():
        print(f"   {k:<25}: {v:.2f}")

    # Print Scores
    print("\n💡 Sub-scores:")
    for k, v in result.get("sub_scores", {}).items():
        print(f"   {k:<15}: {v:.2f}")
    print(f"\n⭐ Overall Financial Score: {result.get('overall_score', 0):.2f}/100")

    # Print Trends
    print("\n📉 Trend Analysis (Consolidated):")
    if result.get("trends"):
        trend_df = pd.DataFrame(result["trends"]).set_index("Metric")
        print(trend_df.to_string(index=True))

    # Print AI Insights
    print("\n🤖 AI-Powered Suggestions:")
    print(result.get("ai_insights", "No insights generated."))


# --- MODIFIED: Added a top-level try/except block ---
if __name__ == "__main__":
    try:
        if len(sys.argv) < 2:
            print("Usage: python analyze_financials.py <file1.xlsx> [file2.xlsx] ...")
            print("Example: python analyze_financials.py 'Data1.xlsx' 'Data2.xlsx'")
        else:
            file_paths_args = sys.argv[1:]
            main_cli(file_paths_args)
    except Exception as e:
        # This will catch ANY crash (like FileNotFoundError)
        print("--- A FATAL ERROR OCCURRED ---")
        print(f"Error: {e}")
        print("This often happens if the file(s) could not be found.")
        print("Please check the file paths and permissions.")
    finally:
        # This makes sure the terminal stays open so you can read the error
        print("\n--- Script finished ---")
        input("Press Enter to exit...")
# --- END MODIFIED ---
