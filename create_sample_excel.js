const xlsx = require('./server/node_modules/xlsx');
const path = require('path');

const sampleData = [
  {
    'Name': 'Arjun Narayan',
    'Time': '06.48 P.M.',
    'Group': 'Group D',
    'Return Time': '07.55 P.M.',
    'Device Details': 'Bank blocked, Reassigned "pn 34 mobile"',
    'Sign': 'Done'
  },
  {
    'Name': 'Ananya Iyer',
    'Time': '09.00 P.M.',
    'Group': 'Group B',
    'Return Time': '10.30 P.M.',
    'Device Details': 'Samsung A53 - Floor Unit',
    'Sign': 'Done'
  },
  {
    'Name': 'Rajesh Khanna',
    'Time': '01.15 P.M.',
    'Group': 'Group C',
    'Return Time': '',
    'Device Details': 'Audio jack faulty, Reassigned "Nokia G21"',
    'Sign': '' // Empty -> will automatically become Pending!
  }
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(sampleData);
xlsx.utils.book_append_sheet(wb, ws, 'Mobile_Records');

const destPath = path.join(__dirname, 'sample_mobile_upload.xlsx');
xlsx.writeFile(wb, destPath);
console.log('Updated sample_mobile_upload.xlsx with signed and pending rows.');
