package main

import (
	"debug/elf"
	"debug/gosym"
	"fmt"
	"os"
	"strconv"
)

// pcat: real-VA pc -> file:line func, compensating the -0x6d60 gosym base shift
func main() {
	f, _ := elf.Open(os.Args[1])
	defer f.Close()
	pcln, _ := f.Section(".gopclntab").Data()
	textAddr := f.Section(".text").Addr
	textStart := uint64(pcln[24]) | uint64(pcln[25])<<8 | uint64(pcln[26])<<16 | uint64(pcln[27])<<24 |
		uint64(pcln[28])<<32 | uint64(pcln[29])<<40 | uint64(pcln[30])<<48 | uint64(pcln[31])<<56
	shift := textStart - textAddr
	tab, _ := gosym.NewTable(nil, gosym.NewLineTable(pcln, textAddr))
	for _, a := range os.Args[2:] {
		v, _ := strconv.ParseUint(a, 0, 64)
		file, line, fn := tab.PCToLine(v - shift)
		if fn == nil {
			fmt.Printf("%#x: none\n", v)
			continue
		}
		fmt.Printf("%#x: %s:%d %s\n", v, file, line, fn.Name)
	}
}
