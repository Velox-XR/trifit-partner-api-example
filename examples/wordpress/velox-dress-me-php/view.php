<?php if (!defined('ABSPATH')) exit; ?>
<section class="vda" data-preview="<?php echo $previewOnly ? 'yes' : 'no'; ?>" data-endpoint="<?php echo esc_url(rest_url('velox-wp/v1/')); ?>" data-assets="<?php echo esc_url(plugins_url('assets/',__FILE__)); ?>">
  <header class="vda-top"><a href="#" class="vda-brand">DRESS ARCHIVE<span>A wardrobe without borders</span></a><a href="https://trifit.v3lox.com/" target="_blank" rel="noopener">Powered by Velox TriFit ↗</a></header>
  <div class="vda-heading"><div><p class="vda-eyebrow">THE VIRTUAL DRESSING ROOM</p><h1>Old dresses.<br><em>New stories.</em></h1></div><p>The dress stays in the archive.<br>You bring it somewhere new.<br>Try a piece on, save your look, make it yours.</p></div>
  <p class="vda-mode" data-mode role="status">Connecting to the dressing room…</p>
  <div class="vda-grid">
    <form class="vda-form">
      <h2>Make it your own</h2><p class="vda-muted" data-upload-help>Start with a clear photo and a dress you love.</p>
      <label class="vda-consent"><input name="consent" type="checkbox"> <span>I have permission to use these images. I agree that choosing an image uploads it to Velox and starts background preparation.</span></label>
      <div class="vda-inputs">
        <label class="vda-upload"><span>Your photograph</span><div class="vda-thumb"><img data-photo alt="Your selected photo" hidden><span data-photo-placeholder>＋<small>Choose a photo</small></span></div><input name="personal" type="file" accept="image/jpeg,image/png,image/webp" disabled><small>JPEG, PNG or WebP · up to 5 MB</small><small data-upload-personal role="status">No photo selected</small></label>
        <label class="vda-upload"><span>The archive dress</span><div class="vda-thumb"><img data-product alt="Your selected dress" hidden><span data-product-placeholder>＋<small>Choose a dress image</small></span></div><input name="product" type="file" accept="image/jpeg,image/png,image/webp" disabled><small>A clear view of the whole garment</small><small data-upload-product role="status">No dress selected</small></label>
      </div>
      <button class="vda-primary" type="submit" disabled data-generate>Create my look</button>
      <button class="vda-secondary" type="button" data-sample hidden>Explore the illustrated example</button>
      <p class="vda-status" data-status role="status" aria-live="polite">Select both images to begin.</p>
      <button class="vda-secondary" type="button" data-check hidden>Check existing request</button>
      <p class="vda-reference" data-reference></p>
      <p class="vda-footnote">An AI visual preview, not a guarantee of garment detail, sizing or physical fit. Images are not published to a public gallery.</p>
    </form>
    <div class="vda-result">
      <div class="vda-result-title"><h2>Your next chapter</h2><span data-result-tag>WAITING FOR YOUR LOOK</span></div>
      <div class="vda-stage" data-stage>
        <div class="vda-empty" data-empty><span>✧</span><p>A dress with history.<br>A photograph that’s yours.</p></div>
        <img data-before class="vda-before" alt="Original photograph" hidden>
        <img data-after class="vda-after" alt="Try-on result" hidden>
        <div class="vda-divider" data-divider hidden><span>↔</span></div>
        <span class="vda-label vda-label-left" data-before-label hidden>BEFORE</span><span class="vda-label vda-label-right" data-after-label hidden>AFTER</span>
      </div>
      <label class="vda-range">Before &amp; after<input type="range" min="0" max="100" value="50" aria-label="Before and after comparison" disabled data-slider><span>Move the slider to compare</span></label>
      <div class="vda-actions"><button type="button" data-download disabled>↓ Download image</button><button type="button" data-share disabled>Share this look</button></div>
      <p class="vda-muted" data-share-note>Sharing options depend on your device and browser.</p>
    </div>
  </div>
  <footer class="vda-footer"><span>DRESS ARCHIVE × VELOX</span><span>Let the garments stay. Let the stories travel.</span></footer>
</section>
