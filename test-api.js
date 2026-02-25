const axios = require('axios');
async function run() {
  try {
    const r = await axios.post('http://localhost:3001/api/import/assign-signals-all');
    console.log(r.data);
  } catch (err) {
    if (err.response) {
      console.log(err.response.data);
    } else {
      console.log(err.message);
    }
  }
}
run();
