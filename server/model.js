const mongoose = require('mongoose');

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect('mongodb://localhost:27017/cloud_files');
}

const UserSchema = new mongoose.Schema({
  id: { type: Number },
  name: { type: String, required: true },
  password: { type: String, required: true },
});

const FileSchema = new mongoose.Schema({
  id: { type: Number },
  user: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  createTime: { type: Number, required: true },
});

const CounterSchema = new mongoose.Schema({
  id: { type: String, required: true },
  seq: { type: Number, default: 2 },
});

const Counter = mongoose.model('counters', CounterSchema);

function preSave(id) {
  return async function (next) {
    const doc = this;
    const res = await Counter.findOne({ id });
    if (res) {
      Counter.updateOne({ id }, { $inc: { seq: 1 }}, () => {});
      doc.id = res.seq;
    } else {
      Counter.create({ id });
      doc.id = 1;
    }
    next();
  }
}

UserSchema.pre('save', preSave('user'));
FileSchema.pre('save', preSave('file'));

const User = mongoose.model('user', UserSchema);
const File = mongoose.model('file', FileSchema);

module.exports = {
  User,
  File,
};
