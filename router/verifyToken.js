const jwt = require('jsonwebtoken')
const JWTKEY = 'bdssuifhs224!41n2k5#'

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.token
  if (authHeader) {
    const token = authHeader
    jwt.verify(token, JWTKEY, (err, user) => {
      if (err) return res.status(403).json("Some error occured")
      req.user = user
      next()
    })
  }
  else {
    return res.status(401).json("Access token is not valid")
  }
}

module.exports = { verifyToken }
