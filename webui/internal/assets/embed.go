package assets

import "embed"

//go:embed build/*
var buildFS embed.FS

// MustAsset returns the bytes of the embedded file at the given path.
// It panics if the file is not found.
func MustAsset(name string) []byte {
	data, err := buildFS.ReadFile("build/" + name)
	if err != nil {
		panic("asset not found: " + name)
	}
	return data
}

// BuildFS returns the embedded filesystem containing the build assets.
func BuildFS() embed.FS {
	return buildFS
}
