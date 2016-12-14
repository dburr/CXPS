# CXPS
Caraxian Private Server - (Another) School Idol Festival private server written for Node.JS

Currently the server will only work on the unofficial SIF_Win32 by AuahDark.

#### SETUP
  - copy `default.config.json` to `config.json` and fill in the requested information.
  - execute `sql/createTables.sql` on the database.
  - install dependancies with `npm install`
  - add the required sqlite databases to `data/db/`
  - run the server with `start_server.bat` or `node index.js`
  
  *Server runs on Port 8080 by default can be changed in `config.json`.

What is commenting?

### Required Game Databases
  - `unit.db_`
  - `item.db_`
  - `live.db_`
  
### Pull Requests
  - If you want to submit a pull request it would be ideal for it to pass eslint checks. I have provided a `.eslintrc.json`