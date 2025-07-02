const express = require('express');
const app = express();
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const cors = require('cors');
const date = require('date-fns')
const format = date.format
const PDFDocument = require('pdfkit'); 
const fs = require('fs');
const path = require('path');



app.use(cors());
app.use(express.json({ limit: '10mb' }))
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(()=>{console.log("database connected successfully")}).catch((e)=>{console.log(e)}).catch(err => console.error("MongoDB connection error:", err));

require('./Schemas/userSchema');
const users = mongoose.model("Users");

require('./Schemas/expenseSchema')
const expense = mongoose.model("Expenses")

//Export route
const exportRoutes = require('./routes/export.js');
app.use('/export', exportRoutes);

const ImageSchema = new mongoose.Schema({
  image: String, 
});

const ImageModel = mongoose.model('Receipts', ImageSchema);

//function for voucher approval
const generateVoucher = async(expenseId) => {
  const Expense = await expense.findById(expenseId);
  if (!Expense || Expense.status !== 'Approved') return;

  const voucherDir = path.join(__dirname, 'vouchers');
  if (!fs.existsSync(voucherDir)) fs.mkdirSync(voucherDir);

  const filePath = path.join(voucherDir, `voucher_${expenseId}.pdf`);
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text('Expense Voucher', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Name : ${Expense.name}`);
  doc.text(`Approval Date : ${format(new Date(),'dd/MM/yyyy')}`);
  doc.text(`Amount : Rs ${Expense.amount}`);
  doc.text(`Category : ${Expense.category}`);
  doc.text(`Expense id : ${Expense._id}`);
  doc.end();
  console.log("generate voucher function")

  Expense.voucherPath = `/vouchers/voucher_${expenseId}.pdf`;
  await Expense.save();
}

app.get('/expense', async (req, res) => {
  const expenses = await expense.find();
  res.json(expenses);
});

app.get('/user',async (req,res) => {
  const { email } = req.query
  try {
    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ 
      name: user.name,
      email:user.email,
      role:user.role
    });
    console.log("backend:",user.name)
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
})

app.use('/vouchers', express.static(path.join(__dirname, 'vouchers')));

//generate voucher
app.put('/generate/expense/:id', async (req, res) => {
  const Expense = await expense.findByIdAndUpdate(req.params.id);

  if (Expense) {
    await generateVoucher(Expense._id);
    console.log("generate voucher api")
    res.json({ message: 'Expense approved and voucher generated',voucherPath:Expense.voucherPath });
  } else {
    res.status(404).json({ error: 'Expense not found' });
  }
});

//Route to change status
app.put('/:id', async (req, res) => {
  try {
    const updatedExpense = await expense.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status,
        note: req.body.note || '',
      },
      { new: true }
    );
    res.json(updatedExpense);
    console.log(req.body.status)
  } catch (err) {
    res.status(500).json({ error: err.message });
    console.log("backend error")
  }
});


app.post('/upload', async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "Image not found" });

  try {
    const newImage = new ImageModel({ image });
    await newImage.save();
    const imageUrl = `http://192.168.129.243:3000/Receipts/${newImage._id}`; 
    res.status(200).json({
        message:"image upload successfully",
        uri:imageUrl,
        id:newImage._id,
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to save image" });
  }
});


app.post("/expense",async (req,res)=>{ 
  const { amount,date,category,receiptUri,status,name,voucherPath,email } = req.body;
  // const formattedDate = format(new Date(date), 'MM/dd/yyyy');

  try{
    await expense.create({
      amount,
      name,
      email,
      date,
      category,
      receiptUri,
      status,
      voucherPath
    })
    console.log("expense submitted")
  }catch(error){
    console.error(error)
    res.send({status:"error",data:error})
    console.log("expense did not submitted")
  }
})



app.post("/register",async (req,res)=>{
    const { name,email,password,role } = req.body;
    const oldUser = await users.findOne({email:email});
 
    if (oldUser){
         return res.status(400).json({ error: 'Email already exists' });
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!regex.test(email)){
            setErrormsg('Enter valid email!!')
            return 
        }


    const encrptedPassword = await bcrypt.hash(password,10)

    try{
        await users.create({
            name,
            email,
            password:encrptedPassword,
            role
        })
       
        res.send({status:"ok",data:"User created"})
    }catch(error){
        console.log(error)
        res.send({status:"error",data:error})
    }
})

app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  const user = await users.findOne({ email });

  if (!user) return res.status(404).json({ message:"Invalid email"});

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) return res.status(401).json({ message:"Enter correct password" });

  if (role === "partner"){
      res.json({ message:"success_partner" });
  }else{
    res.json({ message:"success_admin"})
  }
});

app.listen(3000,()=>{
    console.log("server runs in a port 3000..")
})