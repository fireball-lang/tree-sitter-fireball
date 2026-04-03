package tree_sitter_fireball_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_fireball "github.com/minegame159/fireball/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_fireball.Language())
	if language == nil {
		t.Errorf("Error loading Fireball grammar")
	}
}
