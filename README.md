<!--
# Copyright (C) 2017 Create-Net / FBK.
# All rights reserved. This program and the accompanying materials
# are made available under the terms of the Eclipse Public License 2.0
# which accompanies this distribution, and is available at
# https://www.eclipse.org/legal/epl-2.0/
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Contributors:
#     Create-Net / FBK - initial API and implementation
-->

# agile-api-generator
Generates different human readable version of AGILE API spec

Supported outputs
---

- DBus API as `html`
- DBus API as `json`
- Restful API in `swagger` v2.0
- ~~Restful API in `raml` v1.0~~ To be refactored, waiting for proper 1.0 support!


Installation
---

1. Clone the repository
2. Install `nodejs` and its `npm` package
3. From the repository directory run `npm i`
4. Edit `./config.json` to point to a clone of [agile-iot/agile-api-spec](https://github.com/Agile-IoT/agile-api-spec)
5. run `bin/api-export`, see above for details on usage

Usage
---

Run `bin/api-export` to generate documentation.

To create a specific format only (see supported outputs for the available codes) run providing the format as argument eg. `bin/api-export raml`

To automate the building of the api while editing there is a `gulp` task which serve on a local webserver (http://localhost:8000) the generated api at every change. Use [livereload](https://chrome.google.com/webstore/detail/livereload/jnihajbhpnppcggbcgedagnkighmdlei?hl=en) in chrome to get the page reloaded automatically.

License
---

EPL 1.O
