const fs = require('fs');
const path = require('path');
const { File } = require('../model');

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 最大30M

module.exports.apiHandler = async (ctx, next) => {
  if (ctx.request.path.match(/^\/api/)) {
    const userName = (ctx.session.login && ctx.session.login.name) || ctx.state.user;
    ctx.is('application/json');
    const getFilePath = (name) =>
      path.resolve(__dirname, '../../files/', userName, name);
    switch (ctx.request.path) {
      case '/api/data':
        // 获取用户数据
        var res = await File.find({ user: userName });
        ctx.body = JSON.stringify({
          message: 'success',
          code: 0,
          data: {
            files: res,
            name: userName,
          },
        });
        break;
      case '/api/file/upload':
        // 上传文件
        var file = ctx.request.files[0];
        if (file.size > MAX_FILE_SIZE) {
          ctx.body = JSON.stringify({
            message: '文件大小不能超过30M',
            code: -1,
          });
          return;
        }
        var createTime = new Date().getTime();
        File.create({
          name: file.name,
          user: userName,
          size: file.size,
          createTime,
        });
        fs.createReadStream(file.path).pipe(
          fs.createWriteStream(getFilePath(`${createTime}_${file.name}`))
        );
        ctx.body = JSON.stringify({
          message: 'success',
          code: 0,
        });
        break;
      case '/api/file/delete':
        // 删除文件
        var { id } = ctx.request.fields;
        var res = await File.findOne({ id });
        await File.deleteOne({ id });
        fs.unlinkSync(getFilePath(`${res.createTime}_${res.name}`));
        ctx.body = JSON.stringify({
          message: 'success',
          code: 0,
        });
        break;
      case '/api/file/download':
        // 下载文件
        var { id } = ctx.request.fields;
        var res = await File.findOne({ id });
        var file = fs.readFileSync(
          getFilePath(`${res.createTime}_${res.name}`)
        );
        ctx.body = file;
        break;
      default:
        break;
    }
  } else {
    await next();
  }
};
