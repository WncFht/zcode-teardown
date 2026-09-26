package main

import (
	"debug/elf"
	"debug/gosym"
	"encoding/binary"
	"fmt"
	"os"
	"strconv"
)

func main() {
	f, _ := elf.Open(os.Args[1])
	defer f.Close()
	text := f.Section(".text")
	data, _ := text.Data()
	base := text.Addr
	pcln, _ := f.Section(".gopclntab").Data()
	tab, _ := gosym.NewTable(nil, gosym.NewLineTable(pcln, base))
	targets := map[uint64]bool{}
	for _, a := range os.Args[2:] {
		v, _ := strconv.ParseUint(a, 0, 64)
		targets[v] = true
	}
	for i := 0; i+5 <= len(data); i++ {
		if data[i] != 0xe8 { continue }
		rel := int32(binary.LittleEndian.Uint32(data[i+1:]))
		va := base + uint64(i)
		tgt := uint64(int64(va+5) + int64(rel))
		if targets[tgt] {
			_, line, fn := tab.PCToLine(va)
			name := "?"
			if fn != nil { name = fn.Name }
			fmt.Printf("call %#x -> %#x  in %s :%d\n", va, tgt, name, line)
		}
	}
}
