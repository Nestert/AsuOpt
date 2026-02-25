const { Sequelize, DataTypes, Op } = require("sequelize");

async function check() {
  const sequelize = new Sequelize("sqlite:./server/database.sqlite");
  
  const Signal = sequelize.define('signal', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    name: DataTypes.STRING,
    type: DataTypes.STRING,
    category: DataTypes.STRING
  }, { tableName: 'signals', timestamps: false });
  
  const DeviceReference = sequelize.define('device_reference', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    deviceType: { type: DataTypes.STRING, field: 'device_type' },
    posDesignation: { type: DataTypes.STRING, field: 'pos_designation' }
  }, { tableName: 'device_references', timestamps: false });

  const categories = await Signal.findAll({
    attributes: ['category'],
    where: { category: { [Op.not]: null, [Op.ne]: '' } },
    group: ['category']
  });

  console.log(`Signal categories:`, categories.map(c => c.category));

  const count1 = await DeviceReference.count({ where: { deviceType: 'Датчик давления' }});
  console.log('Count for Датчик давления:', count1);
  
  const allRefTypes = await DeviceReference.findAll({
    attributes: ['deviceType'],
    group: ['deviceType']
  });
  console.log('Available DeviceReference Types:', allRefTypes.map(c => c.deviceType));
}
check();
