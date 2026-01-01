// Types specific to iOS plist parsing

// Plist object with UID reference
export interface PlistUID {
  data: number;
}

// Generic plist object
export interface PlistObject {
  [key: string]: any;
}

// Root structure of Concepts plist
export interface ConceptsPlist {
  $objects: PlistObject[];
  $top: {
    root: PlistUID;
  };
}

// All plist files from a .concept file
export interface ConceptPlists {
  strokes: any;
  drawing: any;
  resources: any;
  metadata: any;
}
