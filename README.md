# agile-api-generator
Generates different human readable version of AGILE API spec

Supported outputs
---

- DBus API as `html`
- DBus API as `json`
- Restful API in `raml` v1.0
- Restful API in `swagger` v2.0

Installation
---

1. Clone the repository
2. Install `nodejs` and its `npm` package
3. From the repository directory run `npm i`

Usage
---

Run `bin/export` to generate documentation.

To create a specific format only (see supported outputs for the available codes) run providing the format as argument eg. `bin/export raml`

License
---

MIT
