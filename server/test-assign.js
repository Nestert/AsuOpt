const { Sequelize, DataTypes, Op } = require("sequelize");

async function check() {
  const sequelize = new Sequelize("sqlite:./database.sqlite");
  
  const Signal = sequelize.define("signal", {
    category: DataTypes.STRING
  }, { tableName: "signals", timestamps: false });
  
  const DeviceReference = sequelize.define("device_reference", {
    deviceType: { type: DataTypes.STRING, field: "device_type" }, 
  }, { tableName: "device_references", timestamps: false });

  const categories = await Signal.findAll({
    attributes: ["category"],
    group: ["category"],
    raw: true
  });
  
  const refs = await DeviceReference.findAll({
    attributes: ["deviceType"],
    group: ["deviceType"],
    raw: true
  });
  
  let matches = 0;
  categories.filter(c=>c.category).forEach(c => {
    const cClean = c.category.trim().toLowerCase();
    const matchedRefs = refs.filter(r => r.deviceType && r.deviceType.trim().toLowerCase() === cClean);
    if(matchedRefs.length > 0) {
      console.log(`[MATCH] "${c.category}" matches [${matchedRefs.map(m=>`"${m.deviceType}"`).join(", ")}]`);
      matches++;
    } else {
      console.log(`[NOMATCH] "${c.category}"`);
    }
  });
  console.log(`Total matches: ${matches}`);
}
check();
