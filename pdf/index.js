//Required package
var pdf = require("pdf-creator-node");
var fs = require("fs");

// Read HTML Template
var html = fs.readFileSync("template.html", "utf8");

var options = {
    format: "A4",
    orientation: "portrait",
    border: "10mm",
    header: {
        height: "45mm",
        contents: '<div style="text-align: right; "> <p  style="font-weight:bold; font-size:2em; margin:0;padding:0;color:blue;"> Fido Waters Ltd</p>Kpansia Market Road, Yenagoa, Bayelsa State. </div>'
    },
    footer: {
        height: "28mm",
        contents: {
            first: 'Cover page',
            2: 'Second page', // Any page number is working. 1-based index
            default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
            last: 'Last Page'
        }
    }
};

var person = 
{
    firstName: "Solomon",
    lastName: "Torulagha",
    name: "Solomon Torulagha",
    age: "26",
    hireDate: new Date(),
    site: {name: 'Yenegwe'},
    jobName: 'Loader',
    baseSalary: 30000,
    sex: 'Male',
    phone: '08198723453'
}

var document = {
    html: html,
    data: {
        person,
    },
    path: `/var/www/uploads/offers/offer_letter_${person.firstName}.pdf`,
    type: "",
};

  pdf
  .create(document, options)
  .then((res) => {
    console.log(res);
  })
  .catch((error) => {
    console.error(error);
  });
