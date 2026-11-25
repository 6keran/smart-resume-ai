# Smart Resume AI companion provenance

The current `CompanionArtwork.tsx` is a project-authored vector reconstruction of the blue cloud robot in the user's attached `codex-clipboard-828d628a-1f89-40cd-acb0-c9d362a882bd.png`. Its outline, terminal face, compact torso, blue hands and short legs follow that visual reference. It replaces the earlier explorer design at the user's request. No externally hosted OpenAI Codex sprite, downloaded model or third-party animation is used.

Art brief: closely retain the reference's large blue cloud-shaped head, small navy screen with cyan `>_`, light-blue chest terminal mark, blue arms/hands, compact torso and short feet. Use the supplied image as the appearance guide rather than substituting a human face or another character. The implementation is redrawn scalable artwork, not the original image bytes or a claim of original OpenAI Codex Pet identity.

Implementation: an articulated vector rig with original keyframe tracks, interpolated shoulder/elbow/hip/knee/foot motion, gaze, eyelids and breathing. `AssistantCompanion.tsx` paints joints at up to 24 frames per second (30 while walking). Walking phase follows actual pointer distance. Resting motion is deterministic, and response/error/success reactions follow existing application events. It uses no runtime animation dependency or external CDN.

The existing vector asset and rig were edited directly. Screen symbols blink/look around without introducing human eyes or facial features absent from the reference. Real request activity controls the thinking indicator. The terminal lettering remains readable when the body turns left. Reduced motion uses a still pose.

The assistant's product identity remains AI Assistant. This character does not imply OpenAI affiliation or change its provider, requests, authentication or conversation state.
