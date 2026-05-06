import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { StickerData } from '../types';

interface StickerProps {
  data: StickerData;
  id?: string;
}

export const Sticker: React.FC<StickerProps> = ({ data, id }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const barcodeDigits = data.barcode.trim() || data.style.trim();
  const spacingUnit = '0.9mm';
  const outerEdgeGap = spacingUnit;
  const groupGap = spacingUnit;
  const itemGap = spacingUnit;
  const contentSidePadding = '1.8mm';
  const textLineHeight = 1.05;
  const specRows = [
    { label: 'COLOUR', value: data.colour },
    { label: 'NET QTY', value: '1 Unit' },
    { label: 'STYLE', value: data.style },
    { label: 'SIZE', value: data.size },
  ];

  useEffect(() => {
    if (barcodeRef.current && barcodeDigits) {
      try {
        JsBarcode(barcodeRef.current, barcodeDigits, {
          format: "CODE128",
          width: 1.22,
          height: 46,
          displayValue: false,
          margin: 0,
          lineColor: "#000000",
          background: "#ffffff"
        });
      } catch (e) {
        console.error("Barcode generation failed", e);
      }
    }
  }, [barcodeDigits]);

  return (
    <div 
      id={id}
      className="flex flex-col overflow-hidden bg-white font-sans"
      style={{ 
        width: '40mm', 
        height: '60mm',
        minWidth: '40mm',
        minHeight: '60mm',
        backgroundColor: '#ffffff',
        color: '#000000',
        boxSizing: 'border-box',
        justifyContent: 'center',
        gap: groupGap,
        paddingTop: outerEdgeGap,
        paddingRight: '3px',
        paddingBottom: outerEdgeGap,
        paddingLeft: '3px',
      }}
    >
      <div
        className="w-full"
        style={{
          width: '100%',
          paddingTop: spacingUnit,
          paddingBottom: spacingUnit,
          paddingLeft: '1mm',
          paddingRight: '1mm',
          borderBottom: '1px solid #000000',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: itemGap,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          className="font-extrabold"
          style={{
            margin: '0',
            fontSize: '9.3pt',
            lineHeight: textLineHeight,
            letterSpacing: '0',
            whiteSpace: 'nowrap',
            fontFamily: 'Arial, Helvetica, sans-serif',
            textAlign: 'center',
            color: '#000000',
          }}
        >
          MRP: ₹ {data.price}/-
        </p>
        <p
          className="font-bold"
          style={{
            margin: '0',
            fontSize: '4.5pt',
            lineHeight: textLineHeight,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            color: '#000000',
          }}
        >
          (Inclusive Of All Taxes)
        </p>
      </div>

      <div
        className="w-full"
        style={{
          paddingLeft: contentSidePadding,
          paddingRight: contentSidePadding,
          paddingTop: '0mm',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'max-content max-content max-content',
            rowGap: itemGap,
            columnGap: '0.45mm',
            justifyItems: 'start',
            width: 'fit-content',
            margin: '0 auto',
          }}
        >
          {specRows.map((row) => (
            <React.Fragment key={row.label}>
              <span
                style={{
                  fontSize: '5pt',
                  lineHeight: textLineHeight,
                  color: '#161616',
                  fontWeight: 800,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  fontSize: '5pt',
                  lineHeight: textLineHeight,
                  color: '#161616',
                  fontWeight: 800,
                }}
              >
                :
              </span>
              <span
                style={{
                  fontWeight: 400,
                  fontSize: '5pt',
                  lineHeight: textLineHeight,
                  color: '#161616',
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  textAlign: 'left',
                }}
              >
                {row.value}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div
        className="flex flex-col items-center"
        style={{
          gap: itemGap,
          paddingTop: itemGap,
          paddingBottom: itemGap,
          paddingLeft: '1.2mm',
          paddingRight: '1.2mm',
          borderBottom: '1px solid #000000',
        }}
      >
        <svg
          ref={barcodeRef}
          style={{
            display: 'block',
            height: '11.2mm',
            width: '33.8mm',
            overflow: 'visible',
            shapeRendering: 'crispEdges',
          }}
        />
      </div>

      <div
        className="w-full text-center"
        style={{
          paddingLeft: contentSidePadding,
          paddingRight: contentSidePadding,
          display: 'flex',
          flexDirection: 'column',
          gap: itemGap,
        }}
      >
        <p
          className="font-bold uppercase"
          style={{
            fontSize: '4.4pt',
            lineHeight: textLineHeight,
            color: '#161616',
          }}
        >
          Marketed & Distributed By
        </p>
        <p
          className="font-bold"
          style={{
            fontSize: '4.5pt',
            lineHeight: textLineHeight,
            color: '#161616',
            margin: '0',
          }}
        >
          Kviss Apparels Private Limited
        </p>
        <div
          style={{
            fontSize: '4.4pt',
            lineHeight: textLineHeight,
            color: '#313135',
            margin: '0',
          }}
        >
          <p><span style={{ color: '#161616', fontWeight: 700 }}>Address:</span> Building 4-5, First Floor, Satya Niketan, New Delhi - 110021</p>
        </div>
      </div>

      <div
        className="w-full text-center"
        style={{
          paddingLeft: contentSidePadding,
          paddingRight: contentSidePadding,
          display: 'flex',
          flexDirection: 'column',
          gap: itemGap,
        }}
      >
        <p
          className="font-bold uppercase"
          style={{
            fontSize: '4.4pt',
            lineHeight: textLineHeight,
            color: '#161616',
          }}
        >
          For Customer Assistance
        </p>
        <div
          style={{
            fontSize: '4.4pt',
            lineHeight: textLineHeight,
            color: '#313135',
            margin: '0',
          }}
        >
          <p><span style={{ color: '#161616', fontWeight: 700 }}>Website:</span> www.hallstatt.co.in</p>
          <p><span style={{ color: '#161616', fontWeight: 700 }}>Call:</span> +91-7982 700723</p>
          <p><span style={{ color: '#161616', fontWeight: 700 }}>Email:</span> support@hallstatt.co.in</p>
        </div>
      </div>

      <div
        className="flex justify-center"
        style={{
          paddingLeft: '1.4mm',
          paddingRight: '1.4mm',
        }}
      >
        <img
          src="https://cdn.shopify.com/s/files/1/0865/4176/2853/files/HL-Logo-Black.png?v=1770789564"
          alt="Hallstatt"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          style={{
            display: 'block',
            width: '90%',
            height: 'auto',
            maxWidth: '90%',
            maxHeight: '100%',
          }}
        />
      </div>

    </div>
  );
};
