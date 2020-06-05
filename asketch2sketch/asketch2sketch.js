import UI from 'sketch/ui';
import {SharedStyle} from 'sketch/dom';
import {fromSJSONDictionary} from 'sketchapp-json-plugin';
import {fixTextLayer, fixSharedTextStyle} from './helpers/fixFont';
import fixImageFillsInLayer from './helpers/fixImageFill';
import fixBitmap from './helpers/fixBitmap';
import fixSVGLayer from './helpers/fixSVG';
import zoomToFit from './helpers/zoomToFit';

function removeExistingLayers(context) {
  if (context.containsLayers()) {
    const loop = context.children().objectEnumerator();
    let currLayer = loop.nextObject();

    while (currLayer) {
      if (currLayer !== context) {
        currLayer.removeFromParent();
      }
      currLayer = loop.nextObject();
    }
  }
}

function getNativeLayer(failingLayers, layer) {
  // debug
  // console.log('Processing ' + layer.name + ' (' + layer._class + ')');

  if (layer._class === 'text') {
    fixTextLayer(layer);
  } else if (layer._class === 'svg') {
    fixSVGLayer(layer);
  } else if (layer._class === 'bitmap') {
    fixBitmap(layer);
  } else {
    fixImageFillsInLayer(layer);
  }

  // Create native object for the current layer, ignore the children for now
  // this alows us to catch and ignore failing layers and finish the import
  const children = layer.layers;
  let nativeObj = null;

  layer.layers = [];

  try {
    nativeObj = fromSJSONDictionary(layer);
  } catch (e) {
    failingLayers.push(layer.name);

    console.log(`Layer failed to import: ${layer.name}`);
    return null;
  }

  // Get native object for all child layers and append them to the current object
  if (children && children.length) {
    children.forEach(child => {
      const nativeChild = getNativeLayer(failingLayers, child);

      if (nativeChild) {
        nativeObj.addLayer(nativeChild);
      }
    });
  }

  return nativeObj;
}

function removeSharedTextStyles(document) {
  document.documentData().layerTextStyles().setObjects([]);
}
function removeSharedLayerStyles(document) {
  document.documentData().layerStyles().setObjects([]);
}

function addSharedTextStyle(document, style) {
  const container = context.document.documentData().layerTextStyles();

  console.log('addSharedTextStyle', style);
  console.log('addSharedLayerStyle container', container);
  console.log('addSharedLayerStyle style.value fromSJSONDictionary', fromSJSONDictionary(style.value));

  if (container.addSharedStyleWithName_firstInstance) {
    console.log('1');
    container.addSharedStyleWithName_firstInstance(style.name, fromSJSONDictionary(style.value));
  } else {
    console.log('2');
    let sharedStyle;
    const allocator = MSSharedStyle.alloc();

    if (allocator.initWithName_firstInstance) {
      console.log('3');
      sharedStyle = allocator.initWithName_firstInstance(style.name, fromSJSONDictionary(style.value));
    } else {
      console.log('4');
      sharedStyle = allocator.initWithName_style(style.name, fromSJSONDictionary(style.value));
    }
    console.log('5');
    container.addSharedObject(sharedStyle);
  }
}

function addSharedLayerStyle(document, {name, style}) {
  SharedStyle.fromStyle({
    name,
    style: fromSJSONDictionary(style),
    document,
  });
}

function removeSharedColors(document) {
  const assets = document.documentData().assets();

  assets.removeAllColorAssets();
}

function addSharedColor(document, colorJSON) {
  const assets = document.documentData().assets();
  const color = fromSJSONDictionary(colorJSON);

  assets.addAsset(color);
}

export default function asketch2sketch(context, asketchFiles, options = {removeSharedStyles: true, clearPage: true}) {
  const document = context.document;
  const page = document.currentPage();

  let asketchDocument = null;
  let asketchPage = null;

  asketchFiles.forEach(asketchFile => {
    if (asketchFile && asketchFile._class === 'document') {
      asketchDocument = asketchFile;
    } else if (asketchFile && asketchFile._class === 'page') {
      asketchPage = asketchFile;
    }
  });

  if (asketchDocument) {
    if (options && options.removeSharedStyles) {
      removeSharedColors(document);
      removeSharedTextStyles(document);
      removeSharedLayerStyles(document);
    }

    if (asketchDocument.assets.colors) {
      asketchDocument.assets.colors.forEach(color => addSharedColor(document, color));

      console.log(`Shared colors added: ${asketchDocument.assets.colors.length}`);
    }

    if (asketchDocument.layerTextStyles && asketchDocument.layerTextStyles.objects) {
      console.log('asketchDocument.layerStyles.objects', asketchDocument.layerTextStyles.objects);
      asketchDocument.layerTextStyles.objects.forEach(style => {
        fixSharedTextStyle(style);
        console.log('style', style);
        addSharedTextStyle(document, style);
      });

      console.log(`Shared text styles added: ${asketchDocument.layerTextStyles.objects.length}`);
    }
    if (asketchDocument.layerStyles && asketchDocument.layerStyles.objects) {
      asketchDocument.layerStyles.objects.forEach(sharedStyle => {
        addSharedLayerStyle(document, sharedStyle);
      });

      console.log(`Shared layer styles added: ${asketchDocument.layerStyles.objects.length}`);
    }
  }

  if (asketchPage) {
    if (options && options.clearPage) {
      removeExistingLayers(page);
    }

    page.name = asketchPage.name;

    const failingLayers = [];

    asketchPage.layers
      .map(getNativeLayer.bind(null, failingLayers))
      .forEach(layer => layer && page.addLayer(layer));

    if (failingLayers.length === 1) {
      UI.alert('asketch2sketch', 'One layer couldn\'t be imported and was skipped.');
    } else if (failingLayers.length > 1) {
      UI.alert('asketch2sketch', `${failingLayers.length} layers couldn't be imported and were skipped.`);
    } else {
      const emojis = ['👌', '👍', '✨', '😍', '🍾', '🤩', '🎉', '👏', '💪', '🤘', '💅', '🏆', '🚀'];

      UI.message(`Import successful ${emojis[Math.floor(emojis.length * Math.random())]}`);
    }

    zoomToFit(context);
  }
}
