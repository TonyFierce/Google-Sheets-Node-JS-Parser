# Google Sheets Node JS Parser
 
## Overview

This script (parser.js) fetches game rewards balance data from a Google Sheets document using a service account for API authentication.

It extracts valid reward balance types from specified columns, tracks active balances for different regions, and saves the results to a JSON file.

## Setup

1. Install dependencies (npm install)

2. Create an .env file in the project folder

3. Add this line to the .env file: GOOGLE_SHEET_KEY_PATH=C:\path\to\service-account-key.json

4. Replace with a valid path to JSON service account key that you downloaded from Google Cloud console

## Output

The output will be saved as region_balance.json in the ./output directory.
