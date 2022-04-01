const express = require('express');
const app = express();
const fs = require('fs');
const mailReader = require('./mail-reader');
// Set EJS as templating engine

app.set('view engine', 'ejs');

app.get('/', (req, res) => {

    // The render method takes the name of the HTML
    // page to be rendered as input
    // This page should be in the views folder
    // in the root directory.
    let today_date = new Date().toLocaleDateString().replaceAll('/', '-');
    let meta_file_path = `${__dirname}/data/meta.json`;
    let today_file_path = `${__dirname}/data/${today_date}.json`;
    if (!(fs.existsSync(meta_file_path) && fs.existsSync(today_file_path))) { res.render("404");return }
    let raw_meta_data = fs.readFileSync(meta_file_path);
    let today_raw_data = fs.readFileSync(today_file_path);
    let today_data = JSON.parse(today_raw_data);
    let meta_data = JSON.parse(raw_meta_data);

    const data = {
        total: meta_data['total'],
        today_total: meta_data[today_date],
        today_data: today_data
    }
    res.render('index', data);

});
app.listen(3000, function () {
    mailReader.initMailReader()
    console.log('listening to port 4000')
});
