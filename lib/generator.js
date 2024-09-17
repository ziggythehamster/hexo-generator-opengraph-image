const fs = require('fs');
const moment = require('moment');
const sp = require('synchronized-promise');

const {
  createCanvas,
  loadImage,
  registerFont
} = require('canvas');

const loadImageSync = sp(loadImage);

var measureFontHeight = function (input, fontStyle) {
  const canvas = createCanvas(1200, 628);
  var context = canvas.getContext("2d");

  var sourceWidth = canvas.width;
  var sourceHeight = canvas.height;

  context.font = fontStyle;
  
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(input, 25, 5);

  var data = context.getImageData(0, 0, sourceWidth, sourceHeight).data;

  var firstY = -1;
  var lastY = -1;

  for(var y = 0; y < sourceHeight; y++) {
      for(var x = 0; x < sourceWidth; x++) {
          var alpha = data[((sourceWidth * y) + x) * 4 + 3];

          if(alpha > 0) {
              firstY = y;
              break;
          }
      }
      if(firstY >= 0) {
          break;
      }

  }

  // loop through each row, this time beginning from the last row
  for(var y = sourceHeight; y > 0; y--) {
      // loop through each column
      for(var x = 0; x < sourceWidth; x++) {
          var alpha = data[((sourceWidth * y) + x) * 4 + 3];
          if(alpha > 0) {
              lastY = y;
              // exit the loop
              break;
          }
      }
      if(lastY >= 0) {
          // exit the loop
          break;
      }

  }

  return lastY - firstY;

};

module.exports = function (locals) {
  const {
    base_dir,
    config
  } = this;
  const {
    opengraph_image,
    title: blog_title
  } = config;
  const {
    blog_title: blog_title_enabled,
    blog_title_font,
    blog_title_font_file,
    blog_title_font_file_family,
    main_color,
    main_image,
    secondary_color,
    font_color,
    title_font,
    title_font_file,
    title_font_file_family,
    date_font,
    date_font_file,
    date_font_file_family,
    date_style
  } = opengraph_image;

  let posts = locals.posts.sort('-date');
  posts = posts.filter(post => {
    return post.draft !== true;
  });
  data = [];
  for (var post in posts.data) {
    var content = posts.data[post];
    var filepath = content['path'] + "thumbnail.png";
    var title = content['title'];
    var date = content['date'];

    let width = 1200;
    let height = 628;

    var is_cjk = (content) => {
      var reg = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\uD79D]/g;
      if (String(content).match(reg)) {
        return true;
      } else {
        return false;
      }
    }

    var wrapText = (text, font, maxWidth, maxHeight, line_height) => {
      const words = [];
      for (const [_, w] of String(text).split(' ').entries()) {
        if (is_cjk(w)) {
          for (const [_, x] of w.split('').entries()) {
            words.push(x);
          }
        } else {
          words.push(w);
        }
      }
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.font = font;
      let line = '';
      let lastLine = '';
      let lines = [];
      for (const [index, w] of words.entries()) {
        let testLine = "";
        if (is_cjk(w)) {
          testLine = line + w;
          if (!is_cjk(words[index + 1])) {
            testLine = testLine + ' ';
          }
        } else {
          testLine = line + w + ' ';
        }
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && index > 0) {
          if (maxHeight < line_height * (index - 1)) {
            line = lastLine + "...";
            break;
          }
          lines.push(line);
          lastLine = "";
          line = w;
          if (!is_cjk(w)) line = line + ' ';
        } else {
          lastLine = line;
          line = testLine;
        }
      }
      if (line.length > 0) {
        lines.push(line);
      }
      return lines.reverse();
    }

    // register fonts if requested
    if (blog_title_font_file && blog_title_font_file_family) {
      registerFont(`${base_dir}/${blog_title_font_file}`, { family: blog_title_font_file_family });
    }

    if (date_font_file && date_font_file_family) {
      registerFont(`${base_dir}/${date_font_file}`, { family: date_font_file_family });
    }

    if (title_font_file && title_font_file_family) {
      registerFont(`${base_dir}/${title_font_file}`, { family: title_font_file_family });
    }

    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    context.fillStyle = main_color;
    context.fillRect(0, 0, width, height);

    // if there is a background imge configured, render it
    if (main_image) {
      context.drawImage(loadImageSync(`${base_dir}/${main_image}`), 0, 0);
    }

    // bar at the bottom
    context.fillStyle = secondary_color;
    context.fillRect(0, 600, width, height);

    // blog title
    if (blog_title_enabled) {
      context.fillStyle = secondary_color;
      context.font = blog_title_font;

      const oldBaseline = context.textBaseline;
      context.textBaseline = "top";
      context.fillText(blog_title, 50, 50);
      context.textBaseline = oldBaseline;
    }


    // date font style
    context.fillStyle = font_color;
    context.font = date_font;
    let date_height = measureFontHeight(date, date_font);
    let remaining = 628 - 58 - date_height;
    context.fillText(moment(date).format(date_style), 50, remaining);

    context.font = title_font;
    context.fillStyle = font_color;
    let line_height = measureFontHeight(title, context.font);
    let lines = wrapText(title, context.font, width - 100, remaining, line_height);
    for (const [index, line] of lines.entries()) {
      context.fillText(line, 50, remaining - (index + 1) * line_height);
    }

    const buffer = canvas.toBuffer('image/png');
    data.push({path: filepath, data: buffer});
  }

  return data;
};