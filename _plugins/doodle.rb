module Jekyll
  class DoodleTag < Liquid::Tag
    def initialize(tag_name, input, tokens)
      super
      @input = input.strip
    end

    def render(context)
      id = @input.split(' ').first
      if id.nil? || id.empty?
        id = "doodle_#{Time.now.to_i}"
      end

      site = context.registers[:site]
      env = Jekyll.env

      image_path = "/assets/doodles/#{id}.webp"
      fs_path = File.join(site.source, "assets", "doodles", "#{id}.webp")
      image_exists = File.exist?(fs_path)

      if env == "production"
        if image_exists
          return "<img src=\"#{image_path}\" class=\"doodle-img\" alt=\"Doodle #{id}\" loading=\"lazy\" />"
        else
          return "<!-- Missing doodle: #{id} -->"
        end
      end

      # Development mode output
      if image_exists
        # We add a cache busting query param during dev so redraws show immediately without hard refresh
        return <<-HTML.gsub(/^\s+/, "")
          <div class="doodle-container has-image" data-doodle-id="#{id}" style="position: relative; display: block; max-width: 100%; margin: 1rem auto; text-align: center;">
            <img src="#{image_path}?v=#{Time.now.to_i}" class="doodle-img" alt="Doodle #{id}" style="max-width: 100%; display: inline-block; margin: 0 auto;" />
            <button class="doodle-edit-btn" onclick="window.openDoodle('#{id}')" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; border: 1px solid white; padding: 6px 12px; cursor: pointer; border-radius: 4px; font-family: monospace; font-size: 14px; opacity: 0; transition: opacity 0.2s;">
              ✎ Edit
            </button>
            <style>
              .doodle-container.has-image:hover .doodle-edit-btn { opacity: 1 !important; }
            </style>
          </div>
        HTML
      else
        return <<-HTML.gsub(/^\s+/, "")
          <div class="doodle-container no-image" data-doodle-id="#{id}" style="display: flex; align-items: center; justify-content: center; width: 100%; max-width: 600px; aspect-ratio: 4/3; background: #f0f0f0; border: 2px dashed #999; cursor: pointer; margin: 1rem auto; color: #333; font-family: monospace;" onclick="window.openDoodle('#{id}')">
            <div style="text-align: center;">
              <strong>Blank Canvas "#{id}"</strong><br/>
              <span style="font-size: 0.9em; opacity: 0.7;">Click to draw</span>
            </div>
          </div>
        HTML
      end
    end
  end
end

Liquid::Template.register_tag('doodle', Jekyll::DoodleTag)
