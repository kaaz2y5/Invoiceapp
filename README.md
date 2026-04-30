# Invoiceapp
Simple Invoice app for my business

A simple, iPad-friendly invoice web app for a mobile oil change business.

## Location
The app files are in:

- `documents/invoiceapp/index.html`
- `documents/invoiceapp/styles.css`
- `documents/invoiceapp/app.js`
- `documents/invoiceapp/service-worker.js`
- `documents/invoiceapp/manifest.webmanifest`
- `documents/invoiceapp/logo.svg`

## Important for iPad offline use
You can open `documents/invoiceapp/index.html` **directly from Files/Safari even with no internet**.

To make this reliable, `index.html` now contains inline CSS + JS, so it does not depend on downloading extra files.

## Features
- Works fully offline when opened directly as a local file
- Save multiple invoices locally on-device so you do not lose them
- Quick customer + vehicle details
- Add/remove service line items
- Automatic subtotal and total calculations (no tax line)
- Print-friendly layout for **Print / Save PDF**
- Put your logo file in `documents/invoiceapp/` as `logo.png`, `logo.jpg`, `logo.jpeg`, or `logo.svg` (app auto-detects)

## Optional local server mode
If you prefer running with a local server:

```bash
python3 -m http.server 8080
```

Then visit:

- `http://localhost:8080/documents/invoiceapp/`
