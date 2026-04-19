module Jekyll
  class VocabBlock < Liquid::Block
    def render(context)
      text = super
      # Convert markdown inside the block to HTML
      site = context.registers[:site]
      converter = site.find_converter_instance(::Jekyll::Converters::Markdown)
      html = converter.convert(text)
      
      "<div class=\"vocab-list-container\" data-nosnippet aria-hidden=\"true\">\n<hr data-content=\"Vocabulary\" />\n<div class=\"vocab-list\">\n#{html}\n</div>\n</div>"
    end
  end
end

Liquid::Template.register_tag('vocab', Jekyll::VocabBlock)
