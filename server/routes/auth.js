const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

router.post('/signup', async (req,res)=>{
  const { name,email,password,role } = req.body;

  const hash = await bcrypt.hash(password,10);

  await db.query(
    `INSERT INTO users(name,email,password_hash,role)
     VALUES(?,?,?,?)`,
    [name,email,hash,role]
  );

  res.json({ ok:true });
});

router.post('/login', async (req,res)=>{
  const { email,password } = req.body;

  const [[user]] = await db.query(
    `SELECT * FROM users WHERE email=?`,
    [email]
  );

  if(!user) return res.status(401).json({ error:'Invalid login' });

  const ok = await bcrypt.compare(password,user.password_hash);
  if(!ok) return res.status(401).json({ error:'Invalid login' });

  const token = jwt.sign(
    { id:user.id, role:user.role },
    process.env.JWT_SECRET,
    { expiresIn:'8h' }
  );

  res.json({
    token,
    user:{
      id:user.id,
      name:user.name,
      role:user.role
    }
  });
});

module.exports = router;
