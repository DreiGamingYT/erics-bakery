const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req,res)=>{
  const [rows] = await db.query(`SELECT * FROM inventory_items`);
  res.json(rows);
});

router.post('/update', requireAuth, async (req,res)=>{
  const { id,inVal,outVal,min } = req.body;

  const [[item]] = await db.query(
    `SELECT qty FROM inventory_items WHERE id=?`,
    [id]
  );

  let newQty = item.qty + inVal - outVal;

  await db.query(
    `UPDATE inventory_items
     SET qty=?, min_qty=?
     WHERE id=?`,
    [newQty,min,id]
  );

  if(inVal){
    await db.query(
      `INSERT INTO inventory_activity(item_id,action,amount)
       VALUES(?,?,?)`,
      [id,'IN',inVal]
    );
  }

  if(outVal){
    await db.query(
      `INSERT INTO inventory_activity(item_id,action,amount)
       VALUES(?,?,?)`,
      [id,'OUT',outVal]
    );
  }

  res.json({ ok:true });
});

router.get('/:id/activity', requireAuth, async (req,res)=>{
  const [rows] = await db.query(
    `SELECT * FROM inventory_activity
     WHERE item_id=?
     ORDER BY created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

module.exports = router;
