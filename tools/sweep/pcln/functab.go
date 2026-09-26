package main

import (
	"debug/elf"
	"encoding/binary"
	"fmt"
	"os"
	"strconv"
)

func main() {
	f, _ := elf.Open(os.Args[1])
	defer f.Close()
	pcln, _ := f.Section(".gopclntab").Data()
	magic := binary.LittleEndian.Uint32(pcln[0:])
	q := uint64(pcln[6])
	nfunc := binary.LittleEndian.Uint64(pcln[8:])
	nfiles := binary.LittleEndian.Uint64(pcln[16:])
	textStart := binary.LittleEndian.Uint64(pcln[24:])
	funcnameOff := binary.LittleEndian.Uint64(pcln[32:])
	cuOff := binary.LittleEndian.Uint64(pcln[40:])
	pctabOff := binary.LittleEndian.Uint64(pcln[56:])
	pclnOff := binary.LittleEndian.Uint64(pcln[64:])
	fmt.Printf("magic=%08x q=%d nfunc=%d nfiles=%d textStart=%#x funcnameOff=%#x cuOff=%#x pctabOff=%#x pclnOff=%#x\n",
		magic, q, nfunc, nfiles, textStart, funcnameOff, cuOff, pctabOff, pclnOff)
	lo, _ := strconv.ParseUint(os.Args[2], 0, 64)
	hi, _ := strconv.ParseUint(os.Args[3], 0, 64)
	for i := uint64(0); i < nfunc; i++ {
		eo := binary.LittleEndian.Uint32(pcln[pclnOff+uint64(i)*8:])
		fo := binary.LittleEndian.Uint32(pcln[pclnOff+uint64(i)*8+4:])
		entry := textStart + uint64(eo)*q
		if entry < lo || entry >= hi { continue }
		fb := pclnOff + uint64(fo)
		nameOff := binary.LittleEndian.Uint32(pcln[fb+4:])
		no := funcnameOff + uint64(nameOff)
		end := no
		for pcln[end] != 0 { end++ }
		fmt.Printf("%06d entry=%#x name=%s\n", i, entry, pcln[no:end])
	}
}
