const xlsx = require('xlsx');
const workbook = xlsx.readFile('../Report_Prospect_CL.xlsx');
const sheet_name_list = workbook.SheetNames;
const xlData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
if (xlData.length > 0) {
    console.log("Columns:", Object.keys(xlData[0]));
    console.log("First Row:", xlData[0]);
} else {
    console.log("Empty sheet");
}
