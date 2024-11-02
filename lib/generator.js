const Promise     = require('bluebird');
const { magenta } = require('picocolors');
const moment      = require('moment');

const {
  createCanvas,
  loadImage,
  registerFont
} = require('canvas');

const WIDTH = 1200;
const HEIGHT = 628;

function drawBackground (context, options) {
  const { base_dir, locals, main_color, main_image } = options;

  const draw = Promise
    .resolve(context)
    .then((context) => {
      context.fillStyle = main_color;
      context.fillRect(0, 0, WIDTH, HEIGHT);

      return context;
    });

  if (!main_image) {
    return draw;
  }

  return draw
    .then((context) => {
      const image = locals.get("opengraph_image_main");

      if (image) {
        return [context, image];
      }

      return loadImage(`${base_dir}/${main_image}`)
        .then((image) => {
          locals.set("opengraph_image_main", image);

          return [context, image];
        });
    })
    .then(([context, image]) => {
      context.drawImage(image, 0, 0);

      return context;
    });
}

// bar at the bottom
function drawBar(context, fill_style) {
  return Promise
    .resolve(context)
    .then((context) => {
      context.fillStyle = fill_style;
      context.fillRect(0, 600, WIDTH, HEIGHT);

      return context;
    });
}

function drawBlogTitle(context, options) {
  const { blog_logo_enabled, blog_title_enabled, fill_style, font, title } = options;

  if (!blog_title_enabled) {
    return Promise.resolve(context);
  }

  return Promise
    .resolve(context)
    .then((context) => {
      context.fillStyle = fill_style;
      context.font = font;

      let blog_title_x = 50;
      let blog_title_y = 50;

      // if blog logo is enabled, draw differently
      if (blog_logo_enabled) {
        const blog_title_height = measureFontHeight(title, font);

        blog_title_x = 50 + 100 + 50;
        blog_title_y = 50 + (50.0 - (blog_title_height / 2.0)); // padding + ((image height / 2) - (text height / 2))
      }

      const oldBaseline = context.textBaseline;
      context.textBaseline = "top";
      context.fillText(title, blog_title_x, blog_title_y);
      context.textBaseline = oldBaseline;

      return context;
    });
}

// draw blog logo if configured
function drawLogo(context, options) {
  const { base_dir, locals, logo } = options;

  if (!logo) {
    return Promise.resolve(context);
  }

  return Promise
    .resolve(context)
    .then((context) => {
      const image = locals.get("opengraph_image_blog_logo");

      if (image) {
        return [context, image];
      }

      return loadImage(`${base_dir}/${logo}`)
        .then((image) => resizeImage(image, 100, 100))
        .then((image) => loadImage(image))
        .then((image) => {
          locals.set("opengraph_image_blog_logo", image);

          return [context, image];
        });
    })
    .then(([context, image]) => {
      context.drawImage(image, 50, 50);

      return context;
    });
}

function drawPostData (context, options) {
  const { date, date_font, date_style, fill_style, title, title_font } = options;

  return Promise
    .resolve(context)
    .then((context) => {
      // date font style
      context.fillStyle = fill_style;
      context.font = date_font;

      const date_height = measureFontHeight(date, context.font);
      let remaining = 628 - 58 - date_height;

      context.fillText(moment(date).format(date_style), 50, remaining);

      // post title font style
      context.fillStyle = fill_style;
      context.font = title_font;

      const line_height = measureFontHeight(title, context.font);
      const lines = wrapText(title, context.font, WIDTH - 100, remaining, line_height);

      for (const [index, line] of lines.entries()) {
        context.fillText(line, 50, remaining - (index + 1) * line_height);
      }

      return context;
    })
}

function is_cjk (content) {
  var reg = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u3131-\uD79D]/g;
  if (String(content).match(reg)) {
    return true;
  } else {
    return false;
  }
}

function measureFontHeight (input, fontStyle) {
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

}

function resizeImage (image, newW, newH) {
  return Promise
    .resolve(createCanvas(newW, newH))
    .then((canvas) => [canvas, canvas.getContext('2d')])
    .then(([canvas, context]) => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return canvas.toDataURL();
    });
}

function wrapText (text, font, maxWidth, maxHeight, line_height) {
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

  const canvas = createCanvas(WIDTH, HEIGHT);
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

module.exports = function (locals) {
  const {
    base_dir,
    config,
    locals: hexo_locals,
    log
  } = this;
  const {
    opengraph_image,
    title: blog_title
  } = config;
  const {
    blog_logo,
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

  return Promise
    .filter(
      locals.posts.sort('-date').toArray(),
      (post) => post.draft !== true
    )
    .map((post) => {
      const content = post;
      const filepath = content['path'] + "thumbnail.png";
      const title = content['title'];
      const date = content['date'];
  
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
  
      const canvas = createCanvas(WIDTH, HEIGHT);
      const context = canvas.getContext('2d');
 
      return drawBackground(context, { base_dir, locals: hexo_locals, main_color, main_image })
        .then((context) => drawBar(context, secondary_color))
        .then((context) => drawLogo(context, { base_dir, locals: hexo_locals, logo: blog_logo }))
        .then((context) => drawBlogTitle(context, { blog_logo_enabled: !!blog_logo, blog_title_enabled, fill_style: secondary_color, font: blog_title_font, title: blog_title }))
        .then((context) => drawPostData(context, { date, date_font, date_style, fill_style: font_color, title, title_font }))
        .then(() => {
          log.info("Generated OpenGraph image: %s", magenta(filepath));

          return Promise.resolve({
            path: filepath,
            data: canvas.toBuffer('image/png')
          });
        });
    }, { concurrency: 10 });
}