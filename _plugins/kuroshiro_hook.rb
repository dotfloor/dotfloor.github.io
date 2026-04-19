module Jekyll
  Hooks.register :site, :post_write do |site|
    Jekyll.logger.info "Furigana:", "Running automatic furigana generation via Kuroshiro..."
    
    # Run the node script synchronously
    # We use system() which passes stdout properly so we see it in the Jekyll output
    success = system("node scripts/furigana.js")
    
    if success
      Jekyll.logger.info "Furigana:", "Finished processing!"
    else
      Jekyll.logger.error "Furigana:", "Error running Kuroshiro script. Is Node.js installed and did you run npm install?"
    end
  end
end
