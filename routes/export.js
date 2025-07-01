const express = require('express');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const Expense = require('../Schemas/expenseSchema');

const router = express.Router();

router.get('/csv', async (req, res) => {
    const expenses = await Expense.find();
    const fields = ['name', 'amount', 'date', 'category', 'status'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(expenses);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('expenses.csv');
    return res.send(csv);
});

router.get('/pdf', async (req, res) => {
    const expenses = await Expense.find();
    const doc = new PDFDocument();
    res.setHeader('Content-disposition', 'attachment; filename=expenses.pdf');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Expense Report', { align: 'center' });
    doc.moveDown();

    expenses.forEach((exp, i) => {
        doc.fontSize(12).text(
          `${i + 1}. ${exp.name} | Rs ${exp.amount} | ${exp.date} | ${exp.category} | ${exp.status}`
        );
    });

    doc.end();
});

module.exports = router;
