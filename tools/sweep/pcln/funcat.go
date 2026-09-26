package main

import (
	"debug/elf"
	"debug/gosym"
	"fmt"
	"os"
	"strconv"
)

func main() {
	f, _ := elf.Open(os.Args[1])
	defer f.Close()
	pcln, _ := f.Section(".gopclntab").Data()
	tab, _ := gosym.NewTable(nil, gosym.NewLineTable(pcln, f.Section(".text").Addr))
	for _, a := range os.Args[2:] {
		v, _ := strconv.ParseUint(a, 0, 64)
		_, line, fn := tab.PCToLine(v)
		if fn == nil { fmt.Printf("%#x: none\n", v); continue }
		fmt.Printf("%#x: %s %d\n", v, fn.Name, line)
	}
}
