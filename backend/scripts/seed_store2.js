require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const u = new URL(process.env.DATABASE_URL);
const p = new Pool({host:u.hostname,port:Number(u.port||5432),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.replace('/',''),ssl:{rejectUnauthorized:false}});
(async()=>{const c=await p.connect();try{
  await c.query(`
    UPDATE stores SET
      legal_name = 'Sai Vikas Pikkili Retail',
      owner_name = 'Sai Vikas',
      business_type = 'proprietorship',
      pan = 'ABCDE1234F',
      gstin = '36ABCDE1234F1Z5',
      fssai_license = '12345678901234',
      alt_phone = '9876543210',
      city = 'Hyderabad',
      state = 'Telangana',
      pincode = '500081',
      opening_time = '08:00',
      closing_time = '22:00',
      delivery_radius_km = 5,
      categories = ARRAY['Grocery','Dairy','Vegetables'],
      bank_holder_name = 'Sai Vikas',
      bank_name = 'HDFC Bank',
      bank_account_no = '50100123456789',
      bank_ifsc = 'HDFC0001234',
      upi_id = 'saivikas@hdfcbank',
      phone_verified = true,
      email_verified = true,
      kyc_verified = false,
      bank_verified = false,
      address_verified = true,
      licence_verified = false,
      location_verified = true,
      approval_status = 'pending'
    WHERE id = 2
  `);
  await c.query(`DELETE FROM store_documents WHERE store_id = 2`);
  await c.query(`
    INSERT INTO store_documents (store_id, doc_type, doc_url) VALUES
      (2, 'PAN',   'https://example.com/docs/pan.pdf'),
      (2, 'GSTIN', 'https://example.com/docs/gstin.pdf'),
      (2, 'FSSAI', 'https://example.com/docs/fssai.pdf'),
      (2, 'BANK',  'https://example.com/docs/bank-proof.pdf')
  `);
  console.log('Store 2 populated with sample data + 4 documents');
}catch(e){console.error(e.message); process.exitCode=1}finally{c.release();await p.end()}})();
