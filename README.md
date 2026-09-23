# Syncrad - Open-source file transfer system

Copyright (C) 2026 AHM

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see https://www.gnu.org/licenses/.

---

# Syncrad

Syncrad is an open-source file transfer system that allows users to transfer files between multiple devices using a username.

Files are transferred between connected devices without being stored as cloud files on the server.

## Features

* Transfer files between multiple devices
* Connect devices using a username
* No permanent cloud storage for transferred files
* Real-time file transfer
* Open-source and self-hostable
* Built with WebSocket technology

## Installation

### 1. Clone the repository

First, clone the Syncrad repository:

```bash
git clone <YOUR-REPOSITORY-URL>
```

Then enter the project directory:

```bash
cd Syncrad
```

### 2. Install dependencies

Install the required project packages:

```bash
npm install
```

### 3. Set up the database

Syncrad uses MySQL.

Create a MySQL database for the project, then import the provided database file:

```text
file_transfer_app.sql
```

You can import the SQL file using MySQL or a database management tool such as phpMyAdmin.

For example, using MySQL:

```bash
mysql -u YOUR_USERNAME -p YOUR_DATABASE < file_transfer_app.sql
```

Replace `YOUR_USERNAME` and `YOUR_DATABASE` with your MySQL username and database name.

### 4. Configure Syncrad

Before running the project, open the `config.jsonc` file and modify its settings according to your environment.

Make sure the configuration contains the correct values for your database connection and other settings required by your installation.

### 5. Run Syncrad

After installing the dependencies, setting up the database, and configuring `config.jsonc`, start the project:

```bash
npm start
```

If your project uses a different start command, replace the command above with the appropriate command for your setup.

## License

Syncrad is free and open-source software licensed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**.

Copyright © 2026 AHM.
