let bcrypt;

try {
  bcrypt = require('bcrypt');
} catch (error) {
  bcrypt = require('bcryptjs');
}

module.exports = bcrypt;
