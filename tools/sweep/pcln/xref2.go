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
	pcln, _ := f.Section(".gopclntab").Data()
	tab, _ := gosym.NewTable(nil, gosym.NewLineTable(pcln, f.Section(".text").Addr))
	targets := map[uint64]string{}
	for _, a := range os.Args[2:] {
		v, _ := strconv.ParseUint(a, 0, 64)
		_, _, fn := tab.PCToLine(v)
		n := "?"
		if fn != nil { n = fn.Name }
		targets[v] = n
	}
	// scan every section for 8-byte absolute pointers
	for _, s := range f.Sections {
		if s.Type != elf.SHT_PROGBITS && s.Type != elf.SHT_NOBITS { continue }
		data, err := s.Data()
		if err != nil || len(data) == 0 { continue }
		for i := 0; i+8 <= len(data); i += 4 {
			v := binary.LittleEndian.Uint64(data[i:])
			if _, ok := targets[v]; ok {
				va := s.Addr + uint64(i)
				fmt.Printf("abs ptr @ %s:%#x -> %#x (%s)\n", s.Name, va, v, targets[v])
			}
		}
	}
	// scan .text for rip-relative operand references (disp32 = tgt - insnEnd) — approximate: check every offset
	text := f.Section(".text")
	data, _ := text.Data()
	for i := 0; i+4 <= len(data); i++ {
		rel := int32(binary.LittleEndian.Uint32(data[i:]))
		end := text.Addr + uint64(i) + 4
		tgt := uint64(int64(end) + int64(rel))
		if n, ok := targets[tgt]; ok {
			va := text.Addr + uint64(i)
			_, line, fn := tab.PCToLine(va)
			name := "?"
			if fn != nil { name = fn.Name }
			fmt.Printf("riprel @ %#x -> %#x (%s) in %s :%d\n", va, tgt, n, name, line)
		}
	}
}
