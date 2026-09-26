package main

import (
	"debug/elf"
	"debug/gosym"
	"fmt"
	"os"
	"strconv"
)

func main() {
	f, err := elf.Open(os.Args[1])
	if err != nil { panic(err) }
	defer f.Close()
	var pcln []byte
	if s := f.Section(".gopclntab"); s != nil {
		pcln, _ = s.Data()
	}
	tab, err := gosym.NewTable(nil, gosym.NewLineTable(pcln, f.Section(".text").Addr))
	if err != nil { panic(err) }
	for _, a := range os.Args[2:] {
		v, _ := strconv.ParseUint(a, 0, 64)
		file, line, fn := tab.PCToLine(v)
		if fn == nil {
			fmt.Printf("%#x: <no func>\n", v)
			continue
		}
		fmt.Printf("%#x: %s [entry=%#x end=%#x] %s:%d\n", v, fn.Name, fn.Entry, fn.End, file, line)
	}
}
