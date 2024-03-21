const sqlite3 = require('sqlite3').verbose();
const { TypedStreamReader, Unarchiver } = require('node-typedstream')

const path = require('path');

class ChatService {
    constructor() {
        this.dbPath = path.join(process.env.HOME, 'Library', 'Messages', 'chat.db');
        this.db = new sqlite3.Database(this.dbPath);
    }

    searchMessages(sqlQuery, params) {
        return new Promise((resolve, reject) => {
            this.db.all(sqlQuery, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
              resolve(rows.map(row => {
                if (row.ROWID) {
                  row.id = row.ROWID.toString()
                }
                if (row.attributedBody) { 
                  row.attributedBody = this.parseAttributedBody(row.attributedBody)
                }
                if (row.date) {
                  row.date = new Date(row.date / 1000000 + 978307200000) // Convert Apple timestamp to JS Date
                }
                return row
              }))
            });
        });
    }

  parseAttributedBody(attributedBody) {
    console.log('attributedBody', attributedBody)
    if (!attributedBody) {
      return null;
    }
    try {
      return Unarchiver.open(attributedBody).decodeAll()
      // Parse the binary plist to a JavaScript object
    } catch (error) {
      console.error('Error parsing attributedBody:', error);
      return null;
    }
  }
}

module.exports = { ChatService }
