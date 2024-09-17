/* global hexo */
'use strict';

hexo.config.opengraph_image = Object.assign({
  enable: true,
  blog_title: false,
  blog_title_font: "Regular 25pt Arial",
  blog_title_font_file: null,
  blog_title_font_file_family: null,
  main_color: '#fff',
  secondary_color: "#000",
  font_color: "#000",
  title_font: "Bold 70pt Arial",
  title_font_file: null,
  title_font_file_family: null,
  date_font: "Regular 30pt Arial",
  date_font_file: null,
  date_font_file_family: null,
  date_style: "YYYY/MM/DD",
}, hexo.config.opengraph_image);

const config = hexo.config.opengraph_image;
const ogimage = require('./lib/generator');

if (!config.enable) {
  return;
}

hexo.extend.generator.register('opengraph_image', locals => {
    return ogimage.call(hexo, locals);
});

hexo.extend.helper.register('opengraph_image', function(){
    if (this.is_post() ) {
        let url_path = "";
        if (this.page.thumbnail) {
            url_path = this.full_url_for(this.page.thumbnail);
        } else {
            url_path = this.full_url_for(this.path).replace(/index\.html$/, "") +'thumbnail.png';
        }
        return '<meta property="og:image" content="' + url_path + '" />';
    }
});