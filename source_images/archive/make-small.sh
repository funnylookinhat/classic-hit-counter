#!/bin/bash

# Directory containing the PNG images (default is current directory)
DIR="${1:-.}"

# Target size percentage (20% of original)
SCALE=0.19

# Create a 'small' directory if it doesn't exist
mkdir -p "$DIR/small"

# Loop through all .png files in the directory
for IMAGE in "$DIR"/*.png; do
  # Check if the file exists and is a regular file
  if [[ -f "$IMAGE" ]]; then
    # Get the current image dimensions
    NEW_WIDTH=39
    NEW_HEIGHT=73

    # Get the base filename without extension
    BASENAME=$(basename "$IMAGE" .png)

    # Set the output filename with '-small' added inside the 'small' directory
    OUTPUT_IMAGE="${DIR}/small/${BASENAME}.png"

    # Resize the image using ImageMagick's convert command
    convert "$IMAGE" -resize ${NEW_WIDTH}x${NEW_HEIGHT} "$OUTPUT_IMAGE"

    echo "Resized $IMAGE from $WIDTH x $HEIGHT to $NEW_WIDTH x $NEW_HEIGHT and saved as $OUTPUT_IMAGE"
  fi
done
